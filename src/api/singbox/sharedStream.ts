// 跨浏览器 tab 的 sing-box gRPC 订阅协调层。
//
// 问题:每个 tab 都各自对 SubscribeLog / SubscribeConnections / SubscribeStatus /
// SubscribeGroups / SubscribeOutbounds 发起长连接,N 个 tab × 5 条流很快耗尽浏览器
// 对单 host 的并发连接数。
//
// 方案:经 Web Locks 选举出唯一 master tab,只有 master 真正发起 gRPC 流,收到的原始
// 消息经 BroadcastChannel 广播给其余 slave tab;每个 tab(含 master)在本地做各自的
// 后处理(日志级别过滤、连接聚合等)。master 退出时锁释放,某个 slave 自动接管。
//
// 这些底层流均无随 tab 变化的参数(级别过滤等都在各 tab 本地完成),因此 master 每种流
// 只需一条,连接总数从 5N 降到 5。
//
// 不支持 Web Locks / BroadcastChannel 的环境(老旧/特殊容器)退化为「本 tab 独立 master」,
// 即恢复成各 tab 自行订阅的旧行为。
import { v4 as uuidv4 } from 'uuid'
import { getActiveSingboxKey, getSingboxClient } from './client'
import { runStream, type StreamHandle } from './streams'

export type SharedStreamId = 'logs' | 'connections' | 'status' | 'groups' | 'outbounds'

// SubscribeStatus / SubscribeConnections 的上报间隔(1s in ns)。
const INTERVAL = 1_000_000_000n

const requireClient = () => {
  const client = getSingboxClient()?.client
  // 抛出后由 runStream 退避重试,等待 client 就绪。
  if (!client) throw new Error('sing-box client unavailable')
  return client
}

// 各共享流的工厂。只在 master tab 上被调用,参数固定、与具体 tab 无关。
const factories: Record<SharedStreamId, (signal: AbortSignal) => AsyncIterable<unknown>> = {
  logs: (signal) => requireClient().subscribeLog({}, { signal }),
  connections: (signal) => requireClient().subscribeConnections({ interval: INTERVAL }, { signal }),
  status: (signal) => requireClient().subscribeStatus({ interval: INTERVAL }, { signal }),
  groups: (signal) => requireClient().subscribeGroups({}, { signal }),
  outbounds: (signal) => requireClient().subscribeOutbounds({}, { signal }),
}

type HubMessage =
  | { t: 'data'; id: SharedStreamId; payload: unknown }
  | { t: 'poll' }
  | { t: 'announce'; tab: string; ids: SharedStreamId[] }
  | { t: 'join'; tab: string; id: SharedStreamId }
  | { t: 'leave'; tab: string; id: SharedStreamId }
  | { t: 'bye'; tab: string }

const coordinationSupported =
  typeof BroadcastChannel !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.locks

const randomTabId = () => uuidv4()

// 单个后端通道的协调中心:负责 master 选举、按需起停底层流、消息广播与本地分发。
class StreamHub {
  private readonly tab = coordinationSupported ? randomTabId() : 'standalone'
  private bc: BroadcastChannel | null = null
  private isMaster = false
  private releaseLock: (() => void) | null = null

  // 本 tab 的消费者与引用计数。
  private readonly consumers = new Map<SharedStreamId, Set<(msg: unknown) => void>>()
  private readonly localCount = new Map<SharedStreamId, number>()

  // 仅 master 使用:正在运行的底层流,以及各 tab 当前的需求集合(含自身)。
  private readonly running = new Map<SharedStreamId, StreamHandle>()
  private readonly tabDemand = new Map<string, Set<SharedStreamId>>()

  constructor(private readonly key: string) {
    if (!coordinationSupported) {
      // 退化:本 tab 即 master,直接本地起流,不广播。
      this.isMaster = true
      return
    }

    this.bc = new BroadcastChannel(`singbox-streams:${key}`)
    this.bc.onmessage = (e: MessageEvent<HubMessage>) => this.onMessage(e.data)

    // 本 tab 离开时通知 master 撤销其需求,以便及时停掉无人订阅的流。
    // (master 自身离开则由锁释放后的新 master 重新 poll 修正,无需 bye。)
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => this.post({ t: 'bye', tab: this.tab }))
    }

    navigator.locks
      .request(
        `singbox-master:${key}`,
        () =>
          new Promise<void>((resolve) => {
            this.releaseLock = resolve
            this.becomeMaster()
          }),
      )
      .catch(() => {})
  }

  // ---- 公共订阅入口 ----

  subscribe(id: SharedStreamId, onMessage: (msg: unknown) => void): StreamHandle {
    let set = this.consumers.get(id)
    if (!set) this.consumers.set(id, (set = new Set()))
    set.add(onMessage)

    const prev = this.localCount.get(id) ?? 0
    this.localCount.set(id, prev + 1)
    if (prev === 0) this.announceJoin(id)

    let closed = false
    return {
      close: () => {
        if (closed) return
        closed = true
        set!.delete(onMessage)
        const next = (this.localCount.get(id) ?? 1) - 1
        this.localCount.set(id, next)
        if (next === 0) this.announceLeave(id)
      },
    }
  }

  // ---- 需求广播(本 tab 视角)----

  private announceJoin(id: SharedStreamId) {
    if (this.isMaster) this.masterJoin(this.tab, id)
    else this.post({ t: 'join', tab: this.tab, id })
  }

  private announceLeave(id: SharedStreamId) {
    if (this.isMaster) this.masterLeave(this.tab, id)
    else this.post({ t: 'leave', tab: this.tab, id })
  }

  private localIds(): SharedStreamId[] {
    const ids: SharedStreamId[] = []
    for (const [id, n] of this.localCount) if (n > 0) ids.push(id)
    return ids
  }

  // ---- master 侧 ----

  private becomeMaster() {
    this.isMaster = true
    this.tabDemand.clear()
    this.tabDemand.set(this.tab, new Set(this.localIds()))
    // 询问其余 tab 的需求,随后按并集起流(此刻尚无流在跑,起流即给所有 tab 下发快照)。
    this.post({ t: 'poll' })
    this.reconcile()
  }

  private union(): Set<SharedStreamId> {
    const u = new Set<SharedStreamId>()
    for (const set of this.tabDemand.values()) for (const id of set) u.add(id)
    return u
  }

  private reconcile() {
    const want = this.union()
    for (const id of want) if (!this.running.has(id)) this.start(id)
    for (const id of [...this.running.keys()]) if (!want.has(id)) this.stop(id)
  }

  private start(id: SharedStreamId) {
    const handle = runStream(factories[id], (payload) => {
      this.dispatch(id, payload)
      this.post({ t: 'data', id, payload })
    })
    this.running.set(id, handle)
  }

  private stop(id: SharedStreamId) {
    this.running.get(id)?.close()
    this.running.delete(id)
  }

  // 有新订阅者加入已在运行的流时,重启该流以重新下发初始快照(连接/分组等增量流必须如此,
  // 否则迟到的订阅者拿不到全量初始状态)。
  private restart(id: SharedStreamId) {
    if (!this.running.has(id)) return
    this.stop(id)
    this.start(id)
  }

  private masterJoin(tab: string, id: SharedStreamId) {
    let set = this.tabDemand.get(tab)
    if (!set) this.tabDemand.set(tab, (set = new Set()))
    set.add(id)
    if (this.running.has(id)) this.restart(id)
    else this.start(id)
  }

  private masterLeave(tab: string, id: SharedStreamId) {
    this.tabDemand.get(tab)?.delete(id)
    if (!this.union().has(id)) this.stop(id)
  }

  // ---- 消息分发 ----

  private dispatch(id: SharedStreamId, payload: unknown) {
    this.consumers.get(id)?.forEach((fn) => fn(payload))
  }

  private post(m: HubMessage) {
    this.bc?.postMessage(m)
  }

  private onMessage(m: HubMessage) {
    switch (m.t) {
      case 'data':
        // 广播不回送发送者,master 不会收到自己的 data。
        if (!this.isMaster) this.dispatch(m.id, m.payload)
        break
      case 'poll':
        if (!this.isMaster) this.post({ t: 'announce', tab: this.tab, ids: this.localIds() })
        break
      case 'announce':
        if (this.isMaster) {
          this.tabDemand.set(m.tab, new Set(m.ids))
          this.reconcile()
        }
        break
      case 'join':
        if (this.isMaster) this.masterJoin(m.tab, m.id)
        break
      case 'leave':
        if (this.isMaster) this.masterLeave(m.tab, m.id)
        break
      case 'bye':
        if (this.isMaster && this.tabDemand.delete(m.tab)) this.reconcile()
        break
    }
  }
}

// 每个后端通道一个 hub(按 key 隔离),全程复用。
const hubs = new Map<string, StreamHub>()

const getHub = (key: string) => {
  let hub = hubs.get(key)
  if (!hub) hubs.set(key, (hub = new StreamHub(key)))
  return hub
}

// 订阅某条共享流。返回的 close 仅注销本地消费者;底层流由 master 按全局需求自动起停。
export const subscribeSharedStream = <T>(
  id: SharedStreamId,
  onMessage: (msg: T) => void,
): StreamHandle => {
  const key = getActiveSingboxKey()
  if (!key) return { close: () => {} }
  return getHub(key).subscribe(id, onMessage as (msg: unknown) => void)
}
