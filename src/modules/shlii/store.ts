import { useStorage } from '@/composables/use-storage'

// Subscription usage URL published by the subscription service, for example
// https://sub.example.com/subscribe/<username>/<token>/usage. Keep the default
// empty: this file ships in public builds, so the URL (a bearer token) must be
// typed once in the page and is then kept in local storage.
export const shliiUsageUrl = useStorage(
  'config/shlii-usage-url',
  import.meta.env.VITE_SHLII_USAGE_URL || '',
)
