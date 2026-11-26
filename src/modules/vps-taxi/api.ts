export interface VpsTaxiInstance {
  id: number
  label: string
  plan: string
  status: string
  region: string
  ipv4: string
  ipv4_all?: string[]
  ipv6_prefix?: string | null
  created_at: string
  renews_at: string | null
  billing?: {
    price: string
    currency: string
    term: number
    period: string
  }
}

export interface VpsTaxiBandwidthDay {
  date: string
  incoming_bytes: number
  outgoing_bytes: number
  total_bytes: number
}

export interface VpsTaxiBandwidth {
  instance_id: number
  period_start: string
  period_end: string
  incoming_bytes: number
  outgoing_bytes: number
  total_bytes: number
  quota_bytes: number
  quota_purchased_bytes: number
  updated_at: string
  timezone: string
  days: VpsTaxiBandwidthDay[]
}

export interface VpsTaxiSnapshot {
  instances: VpsTaxiInstance[]
  bandwidth: Record<number, VpsTaxiBandwidth>
}

export type VpsTaxiErrorKind =
  'unauthorized' | 'rateLimited' | 'unavailable' | 'network' | 'unknown'

export class VpsTaxiError extends Error {
  readonly kind: VpsTaxiErrorKind

  constructor(kind: VpsTaxiErrorKind) {
    super(kind)

    this.name = 'VpsTaxiError'
    this.kind = kind
  }
}

const kindFromStatus = (status: number): VpsTaxiErrorKind => {
  if (status === 401 || status === 403 || status === 404) return 'unauthorized'
  if (status === 429) return 'rateLimited'
  if (status >= 500) return 'unavailable'

  return 'unknown'
}

// The client API answers no CORS preflight, so `base` is normally a same-origin
// path served by a reverse proxy that injects the bearer token. When the caller
// supplies a key it is sent directly, which only works where CORS is not
// enforced (a proxy that forwards the header, or a non-browser client).
const request = async <T>(url: string, apiKey: string): Promise<T> => {
  const headers: Record<string, string> = { Accept: 'application/json' }

  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  let response: Response

  try {
    response = await fetch(url, { headers })
  } catch {
    throw new VpsTaxiError('network')
  }

  if (!response.ok) throw new VpsTaxiError(kindFromStatus(response.status))

  try {
    return (await response.json()) as T
  } catch {
    // A proxy that misses the route falls through to index.html and returns
    // HTML with status 200; report it as unreadable rather than a network error.
    throw new VpsTaxiError('unknown')
  }
}

const trimBase = (base: string) => base.trim().replace(/\/+$/, '')

export const fetchVpsTaxiSnapshot = async (
  base: string,
  apiKey: string,
): Promise<VpsTaxiSnapshot> => {
  const root = trimBase(base)

  if (!root) throw new VpsTaxiError('unauthorized')

  const list = await request<{ instances?: VpsTaxiInstance[] }>(`${root}/instances`, apiKey)
  const instances = list.instances ?? []

  // One request per instance on top of the list call, against a 60 req/min
  // budget, so a refresh stays well inside the limit for a handful of servers.
  const pairs = await Promise.all(
    instances.map(async (instance) => {
      const payload = await request<{ bandwidth: VpsTaxiBandwidth }>(
        `${root}/instances/${instance.id}/bandwidth`,
        apiKey,
      )

      return [instance.id, payload.bandwidth] as const
    }),
  )

  return { instances, bandwidth: Object.fromEntries(pairs) }
}

export const getVpsTaxiErrorKind = (error: unknown): VpsTaxiErrorKind =>
  error instanceof VpsTaxiError ? error.kind : 'network'
