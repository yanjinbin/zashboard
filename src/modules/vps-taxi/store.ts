import { useStorage } from '@/composables/use-storage'

// Defaults to a same-origin path: the reverse proxy in front of the dashboard
// adds the bearer token, so the key never reaches the browser.
export const vpsTaxiApiBase = useStorage(
  'config/vps-taxi-api-base',
  import.meta.env.VITE_VPS_TAXI_API_BASE || '/vps-taxi/api/v1',
)

// Optional. Only needed when the request is not authenticated by the proxy.
export const vpsTaxiApiKey = useStorage('config/vps-taxi-api-key', '')
