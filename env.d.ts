/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ZASHBOARD_RELEASE_REPO?: string
  readonly VITE_ZASHBOARD_RELEASE_ASSET?: string
}

interface Window {
  ksu?: object
}
