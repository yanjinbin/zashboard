import { useStorage } from '@/composables/use-storage'

// Subscription usage URL published by the subscription service, for example
// https://sub.example.com/subscribe/<token>/usage
export const shliiUsageUrl = useStorage(
  'config/shlii-usage-url',
  import.meta.env.VITE_SHLII_USAGE_URL || '',
)
