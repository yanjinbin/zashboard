const DEFAULT_RELEASE_REPO = 'yanjinbin/zashboard'
const DEFAULT_RELEASE_ASSET = 'dist-cdn-fonts.zip'

const normalizeReleaseRepo = (repo: string | undefined) => {
  const value = repo
    ?.trim()
    .replace(/^https:\/\/github\.com\//, '')
    .replace(/\/$/, '')
  return value || DEFAULT_RELEASE_REPO
}

export const zashboardReleaseRepo = normalizeReleaseRepo(
  import.meta.env.VITE_ZASHBOARD_RELEASE_REPO,
)
export const zashboardReleaseAsset =
  import.meta.env.VITE_ZASHBOARD_RELEASE_ASSET?.trim() || DEFAULT_RELEASE_ASSET

export const getZashboardRepoUrl = () => `https://github.com/${zashboardReleaseRepo}`

export const getZashboardLatestReleaseApiUrl = () =>
  `https://api.github.com/repos/${zashboardReleaseRepo}/releases/latest`

export const normalizeZashboardReleaseVersion = (version: string) => {
  const value = version.trim()
  if (!value || value === 'latest') return 'latest'
  if (!value.startsWith('v') && /^\d/.test(value)) return `v${value}`
  return value
}

export const getZashboardReleaseAssetUrl = (version = 'latest') => {
  const normalizedVersion = normalizeZashboardReleaseVersion(version)
  return `${getZashboardRepoUrl()}/releases/${normalizedVersion === 'latest' ? 'latest/download' : `download/${normalizedVersion}`}/${zashboardReleaseAsset}`
}
