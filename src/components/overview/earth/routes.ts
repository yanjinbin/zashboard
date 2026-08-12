import { connectionAccessor } from '@/assembly/connections'
import type { Connection } from '@/types'
import * as ipaddr from 'ipaddr.js'
import type { EarthHostTraffic, EarthLocation, EarthRoute } from './types'

interface RouteCandidate {
  destinationIP: string
  upload: number
  download: number
  host: string
  downloaded: number
}

const normalizeIP = (value: string) => {
  try {
    return ipaddr.parse(value).toNormalizedString()
  } catch {
    return null
  }
}

/** Splits IP, IP:port and bracketed IPv6 without interpreting a domain as an IP. */
const destinationIP = (rawValue: string) => {
  const value = rawValue.trim()

  if (!value) return null

  const bareIP = normalizeIP(value)

  if (bareIP) return bareIP

  if (value.startsWith('[')) {
    const closingBracket = value.indexOf(']')

    if (closingBracket > 1) return normalizeIP(value.slice(1, closingBracket))
  }

  const lastColon = value.lastIndexOf(':')

  if (lastColon > 0 && /^\d+$/.test(value.slice(lastColon + 1))) {
    return normalizeIP(value.slice(0, lastColon))
  }

  return null
}

const extractCandidates = (connections: readonly Connection[]): RouteCandidate[] => {
  const accessor = connectionAccessor()
  const candidates: RouteCandidate[] = []

  for (const connection of connections) {
    const destination = destinationIP(accessor.destination(connection))

    if (!destination) continue

    const rawHost = accessor.hostname(connection).trim().replace(/\.$/, '')

    candidates.push({
      destinationIP: destination,
      upload: Math.max(0, connection.uploadSpeed),
      download: Math.max(0, connection.downloadSpeed),
      host: rawHost || destination,
      downloaded: Math.max(0, accessor.download(connection)),
    })
  }

  return candidates
}

const coordinateKey = ({ latitude, longitude }: EarthLocation) =>
  `${latitude.toFixed(4)},${longitude.toFixed(4)}`

const mergeTopHosts = (...groups: EarthHostTraffic[][]) =>
  groups
    .flat()
    .sort((left, right) => right.downloaded - left.downloaded)
    .slice(0, 5)

export const buildEarthRoutes = async (
  connections: readonly Connection[],
  originIP: string,
  locale: string,
  lookup: (ips: string[], locale: string) => Promise<Record<string, EarthLocation | null>>,
) => {
  const normalizedOrigin = normalizeIP(originIP)

  if (!normalizedOrigin) return { routes: [] as EarthRoute[], origin: null }

  const candidates = extractCandidates(connections)
  const ips = new Set<string>([normalizedOrigin])

  for (const candidate of candidates) ips.add(candidate.destinationIP)

  const locations = await lookup([...ips], locale)
  const origin = locations[normalizedOrigin]

  if (!origin) return { routes: [] as EarthRoute[], origin: null }

  const aggregated = new Map<string, EarthRoute>()

  for (const candidate of candidates) {
    const destination = locations[candidate.destinationIP]

    if (!destination) continue

    const path: EarthRoute['path'] = [
      { ...origin, role: 'origin' },
      { ...destination, role: 'destination' },
    ]
    const key = path.map((point) => `${point.role}:${coordinateKey(point)}`).join('>')
    const existing = aggregated.get(key)

    if (existing) {
      existing.connections += 1
      existing.upload += candidate.upload
      existing.download += candidate.download
      existing.topHosts = mergeTopHosts(
        existing.topHosts,
        candidate.host ? [{ host: candidate.host, downloaded: candidate.downloaded }] : [],
      )
    } else {
      aggregated.set(key, {
        key,
        path,
        connections: 1,
        upload: candidate.upload,
        download: candidate.download,
        topHosts: candidate.host
          ? [{ host: candidate.host, downloaded: candidate.downloaded }]
          : [],
      })
    }
  }

  return { routes: [...aggregated.values()], origin }
}
