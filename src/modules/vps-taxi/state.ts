import {
  fetchVpsTaxiSnapshot,
  getVpsTaxiErrorKind,
  type VpsTaxiBandwidth,
  type VpsTaxiErrorKind,
  type VpsTaxiInstance,
  type VpsTaxiSnapshot,
} from '@/modules/vps-taxi/api'
import { vpsTaxiApiBase, vpsTaxiApiKey } from '@/modules/vps-taxi/store'
import { computed, ref, watch } from 'vue'

// The API allows 60 requests per minute; a one-minute floor keeps route
// switches, tab switches and remounts from spending that budget.
const TTL = 60_000
const CACHE_KEY = 'config/vps-taxi-cache'

interface CachedSnapshot {
  identity: string
  fetchedAt: number
  snapshot: VpsTaxiSnapshot
}

// Identifies the endpoint without persisting the secret itself.
const identity = () =>
  `${vpsTaxiApiBase.value.trim()}|${vpsTaxiApiKey.value.length}|${vpsTaxiApiKey.value.slice(-4)}`

export const vpsTaxiSnapshot = ref<VpsTaxiSnapshot | null>(null)
export const vpsTaxiLoading = ref(false)
export const vpsTaxiError = ref<VpsTaxiErrorKind | null>(null)
export const vpsTaxiFetchedAt = ref<number | null>(null)

const readCache = (): CachedSnapshot | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)

    if (!raw) return null

    const cached = JSON.parse(raw) as CachedSnapshot

    if (!cached?.snapshot || cached.identity !== identity()) return null

    return cached
  } catch {
    return null
  }
}

const writeCache = (snapshot: VpsTaxiSnapshot, fetchedAt: number) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ identity: identity(), fetchedAt, snapshot }))
  } catch {
    // Storage can be full or disabled; the in-memory copy still works.
  }
}

const clearCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // ignore
  }
}

// Hydrate before the first render so reopening the page shows the last report
// immediately instead of a skeleton.
const hydrated = readCache()

if (hydrated) {
  vpsTaxiSnapshot.value = hydrated.snapshot
  vpsTaxiFetchedAt.value = hydrated.fetchedAt
}

export const vpsTaxiStale = computed(() => {
  if (!vpsTaxiFetchedAt.value) return true

  return Date.now() - vpsTaxiFetchedAt.value > TTL
})

export const vpsTaxiRefreshing = computed(
  () => vpsTaxiLoading.value && vpsTaxiSnapshot.value !== null,
)

export const vpsTaxiInstances = computed(() =>
  (vpsTaxiSnapshot.value?.instances ?? []).filter((instance) => instance.status !== 'deleted'),
)

export const vpsTaxiBandwidthOf = (instanceId: number): VpsTaxiBandwidth | null =>
  vpsTaxiSnapshot.value?.bandwidth[instanceId] ?? null

export const vpsTaxiTotals = computed(() => {
  const rows = vpsTaxiInstances.value
    .map((instance) => vpsTaxiSnapshot.value?.bandwidth[instance.id])
    .filter((row): row is VpsTaxiBandwidth => Boolean(row))

  return rows.reduce(
    (acc, row) => ({
      incoming: acc.incoming + row.incoming_bytes,
      outgoing: acc.outgoing + row.outgoing_bytes,
      total: acc.total + row.total_bytes,
      quota: acc.quota + row.quota_bytes + row.quota_purchased_bytes,
    }),
    { incoming: 0, outgoing: 0, total: 0, quota: 0 },
  )
})

export const vpsTaxiPercentage = computed(() => {
  const { total, quota } = vpsTaxiTotals.value

  if (quota <= 0) return 0

  return Number(((total / quota) * 100).toFixed(2))
})

export const vpsTaxiPeriod = computed(() => {
  const row = vpsTaxiInstances.value
    .map((instance) => vpsTaxiSnapshot.value?.bandwidth[instance.id])
    .find((item): item is VpsTaxiBandwidth => Boolean(item))

  return row ?? null
})

let pending: Promise<void> | null = null
let requestSeq = 0

export const resetVpsTaxi = () => {
  requestSeq++
  vpsTaxiSnapshot.value = null
  vpsTaxiError.value = null
  vpsTaxiFetchedAt.value = null
  clearCache()
}

// A changed endpoint or key invalidates whatever was cached for the old one.
watch([vpsTaxiApiBase, vpsTaxiApiKey], () => {
  if (identity() === (readCache()?.identity ?? '')) return

  requestSeq++
  vpsTaxiSnapshot.value = null
  vpsTaxiFetchedAt.value = null
  vpsTaxiError.value = null
  clearCache()
})

export const refreshVpsTaxi = (force = false): Promise<void> => {
  if (pending) return pending

  if (!force && vpsTaxiSnapshot.value && vpsTaxiFetchedAt.value) {
    if (Date.now() - vpsTaxiFetchedAt.value < TTL) return Promise.resolve()
  }

  const seq = ++requestSeq
  vpsTaxiLoading.value = true

  pending = (async () => {
    try {
      const snapshot = await fetchVpsTaxiSnapshot(vpsTaxiApiBase.value, vpsTaxiApiKey.value.trim())

      if (seq !== requestSeq) return

      const fetchedAt = Date.now()

      vpsTaxiSnapshot.value = snapshot
      vpsTaxiError.value = null
      vpsTaxiFetchedAt.value = fetchedAt
      writeCache(snapshot, fetchedAt)
    } catch (error) {
      if (seq !== requestSeq) return

      vpsTaxiError.value = getVpsTaxiErrorKind(error)
    } finally {
      if (seq === requestSeq) vpsTaxiLoading.value = false

      pending = null
    }
  })()

  return pending
}

export type { VpsTaxiBandwidth, VpsTaxiInstance }
