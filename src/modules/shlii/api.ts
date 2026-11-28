export interface ShliiUsageInstance {
  id: number
  name: string
  status: string
  used: number
  limit: number | null
  expiresAt: string | null
  cpu: number
  memory: number
  disk: number
  image: string
  autoRenew: boolean
  region?: string
  node?: string
  plan?: string
  price?: string | number
  ipv4?: string
  publicIpv4?: string
  publicIpv6?: string
  sshPort?: number
  networkMode?: string
}

export interface ShliiUsageRegion {
  countryCode: string
  location: string
}

export interface ShliiUsage {
  balance: string
  used: number
  limit: number
  instances: ShliiUsageInstance[]
  regions: ShliiUsageRegion[]
  updatedAt: string
}

export type ShliiUsageErrorKind = 'unauthorized' | 'unavailable' | 'network' | 'unknown'

export class ShliiUsageError extends Error {
  readonly kind: ShliiUsageErrorKind

  constructor(kind: ShliiUsageErrorKind) {
    super(kind)

    this.name = 'ShliiUsageError'
    this.kind = kind
  }
}

const kindFromStatus = (status: number): ShliiUsageErrorKind => {
  if (status === 401 || status === 403 || status === 404) return 'unauthorized'
  if (status >= 500) return 'unavailable'

  return 'unknown'
}

// A plain GET keeps this a "simple" CORS request: the global axios interceptor
// adds an Authorization header, which would force a preflight the usage endpoint
// does not answer. The subscription service holds the Shlii credentials.
export const fetchShliiUsage = async (url: string): Promise<ShliiUsage> => {
  let response: Response

  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } })
  } catch {
    throw new ShliiUsageError('network')
  }

  if (!response.ok) throw new ShliiUsageError(kindFromStatus(response.status))

  const payload = (await response.json()) as ShliiUsage

  return { ...payload, regions: payload.regions ?? [] }
}

export const getShliiUsageErrorKind = (error: unknown): ShliiUsageErrorKind =>
  error instanceof ShliiUsageError ? error.kind : 'network'
