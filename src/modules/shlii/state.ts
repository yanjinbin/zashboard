import {
  fetchShliiUsage,
  getShliiUsageErrorKind,
  type ShliiUsage,
  type ShliiUsageErrorKind,
} from '@/modules/shlii/api'
import { shliiUsageUrl } from '@/modules/shlii/store'
import { computed, ref, watch } from 'vue'

// The subscription service caches upstream responses for 60s; keep the same
// floor here so route changes, tab switches and remounts do not refetch. Cached
// data is always rendered first and revalidated in the background.
const TTL = 60_000
const CACHE_KEY = 'config/shlii-usage-cache'

interface CachedUsage {
  url: string
  fetchedAt: number
  usage: ShliiUsage
}

export const shliiUsage = ref<ShliiUsage | null>(null)
export const shliiUsageLoading = ref(false)
export const shliiUsageError = ref<ShliiUsageErrorKind | null>(null)
export const shliiUsageFetchedAt = ref<number | null>(null)

export const hasShliiUsageUrl = computed(() => Boolean(shliiUsageUrl.value.trim()))

const readCache = (): CachedUsage | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)

    if (!raw) return null

    const cached = JSON.parse(raw) as CachedUsage

    if (!cached?.usage || cached.url !== shliiUsageUrl.value.trim()) return null

    return cached
  } catch {
    return null
  }
}

const writeCache = (usage: ShliiUsage, fetchedAt: number) => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ url: shliiUsageUrl.value.trim(), fetchedAt, usage }),
    )
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

// Hydrate before the first render so reopening the page (or a full reload) shows
// the last report immediately instead of a skeleton.
const hydrated = readCache()

if (hydrated) {
  shliiUsage.value = hydrated.usage
  shliiUsageFetchedAt.value = hydrated.fetchedAt
}

export const shliiUsageStale = computed(() => {
  if (!shliiUsageFetchedAt.value) return true

  return Date.now() - shliiUsageFetchedAt.value > TTL
})

export const shliiUsageRefreshing = computed(
  () => shliiUsageLoading.value && shliiUsage.value !== null,
)

export const shliiUsageInstances = computed(() =>
  (shliiUsage.value?.instances ?? []).filter((instance) => instance.status !== 'deleted'),
)

export const shliiUsageRunning = computed(
  () => shliiUsageInstances.value.filter((instance) => instance.status === 'running').length,
)

export const shliiUsagePercentage = computed(() => {
  const usage = shliiUsage.value

  if (!usage || usage.limit <= 0) return 0

  return Number(((usage.used / usage.limit) * 100).toFixed(2))
})

let pending: Promise<void> | null = null
let requestSeq = 0

export const resetShliiUsage = () => {
  requestSeq++
  shliiUsage.value = null
  shliiUsageError.value = null
  shliiUsageFetchedAt.value = null
  clearCache()
}

// A changed URL invalidates whatever was cached for the previous endpoint.
watch(shliiUsageUrl, (url) => {
  if (url.trim() === (readCache()?.url ?? '')) return

  requestSeq++
  shliiUsage.value = null
  shliiUsageFetchedAt.value = null
  shliiUsageError.value = null
  clearCache()
})

export const refreshShliiUsage = (force = false): Promise<void> => {
  if (pending) return pending

  const url = shliiUsageUrl.value.trim()

  if (!url) {
    resetShliiUsage()

    return Promise.resolve()
  }

  if (!force && shliiUsage.value && shliiUsageFetchedAt.value) {
    if (Date.now() - shliiUsageFetchedAt.value < TTL) return Promise.resolve()
  }

  const seq = ++requestSeq
  shliiUsageLoading.value = true

  pending = (async () => {
    try {
      const usage = await fetchShliiUsage(url)

      if (seq !== requestSeq) return

      const fetchedAt = Date.now()

      shliiUsage.value = usage
      shliiUsageError.value = null
      shliiUsageFetchedAt.value = fetchedAt
      writeCache(usage, fetchedAt)
    } catch (error) {
      if (seq !== requestSeq) return

      shliiUsageError.value = getShliiUsageErrorKind(error)
    } finally {
      if (seq === requestSeq) shliiUsageLoading.value = false

      pending = null
    }
  })()

  return pending
}
