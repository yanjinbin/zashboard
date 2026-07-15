<template>
  <!-- backend -->
  <div
    v-if="hasVisibleItems"
    class="flex flex-col gap-3 text-sm"
  >
    <div class="flex items-center gap-2 px-1">
      <div class="indicator">
        <span
          v-if="isCoreUpdateAvailable"
          class="indicator-item top-1 -right-1 flex"
        >
          <span class="bg-secondary absolute h-2 w-2 animate-ping rounded-full"></span>
          <span class="bg-secondary h-2 w-2 rounded-full"></span>
        </span>
        <a
          class="flex cursor-pointer items-center gap-2 text-lg font-semibold"
          :href="
            isSingBoxCore
              ? 'https://github.com/sagernet/sing-box'
              : MIHOMO_CHANNEL[mihomo?.[0] ?? MIHOMO.Meta].url
          "
          target="_blank"
        >
          {{ $t('backend') }}
          <BackendVersion class="text-sm font-normal" />
        </a>
      </div>
    </div>

    <div
      class="settings-grid"
      v-if="hasVisibleActions || isVisibleBackendSwitch || isVisibleDnsQuery"
    >
      <SettingItem
        :setting-key="k.backend"
        class="p-4"
      >
        <BackendSwitch />
      </SettingItem>

      <template v-if="!isSingboxBackend">
        <SettingItem
          :setting-key="k.upgradeCore"
          :when="canShowCoreActions && !activeBackend?.disableUpgradeCore"
        >
          <div class="setting-item-label">
            {{ $t('upgradeCore') }}
          </div>
          <button
            class="btn btn-neutral btn-sm"
            @click="showUpgradeCoreModal = true"
          >
            <ArrowUpCircleIcon class="h-4 w-4" />
          </button>
        </SettingItem>
        <SettingItem
          :setting-key="k.restartCore"
          :when="canShowCoreActions"
        >
          <div class="setting-item-label">
            {{ $t('restartCore') }}
          </div>
          <button
            class="btn btn-sm"
            @click="handlerClickRestartCore"
          >
            <span
              v-if="isCoreRestarting"
              class="loading loading-spinner h-4 w-4"
            ></span>
            <ArrowPathRoundedSquareIcon
              v-else
              class="h-4 w-4"
            />
          </button>
        </SettingItem>
        <SettingItem
          :setting-key="k.reloadConfigs"
          :when="canShowCoreActions"
        >
          <div class="setting-item-label">
            {{ $t('reloadConfigs') }}
          </div>
          <button
            class="btn btn-sm"
            @click="handlerClickReloadConfigs"
          >
            <span
              v-if="isConfigReloading"
              class="loading loading-spinner h-4 w-4"
            ></span>
            <ArrowPathIcon
              v-else
              class="h-4 w-4"
            />
          </button>
        </SettingItem>
        <SettingItem
          :setting-key="k.updateConfigs"
          :when="canShowCoreActions && !isSingBoxCore"
        >
          <div class="setting-item-label">
            {{ $t('updateConfigs') }}
          </div>
          <button
            class="btn btn-sm"
            @click="showUpdateConfigModal = true"
          >
            <PencilSquareIcon class="h-4 w-4" />
          </button>
        </SettingItem>
        <SettingItem
          :setting-key="k.updateGeoDatabase"
          :when="canShowCoreActions"
        >
          <div class="setting-item-label">
            {{ $t('updateGeoDatabase') }}
          </div>
          <button
            class="btn btn-sm"
            @click="handlerClickUpdateGeo"
          >
            <span
              v-if="isGeoUpdating"
              class="loading loading-spinner h-4 w-4"
            ></span>
            <ArrowDownTrayIcon
              v-else
              class="h-4 w-4"
            />
          </button>
        </SettingItem>
        <SettingItem :setting-key="k.flushDNSCache">
          <div class="setting-item-label">
            {{ $t('flushDNSCache') }}
          </div>
          <button
            class="btn btn-sm"
            @click="handleFlushDNSCache"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </SettingItem>
        <SettingItem :setting-key="k.flushFakeIP">
          <div class="setting-item-label">
            {{ $t('flushFakeIP') }}
          </div>
          <button
            class="btn btn-sm"
            @click="handleFlushFakeIP"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </SettingItem>
        <SettingItem
          :setting-key="k.flushSmartWeights"
          :when="hasSmartGroup"
        >
          <div class="setting-item-label">
            {{ $t('flushSmartWeights') }}
          </div>
          <button
            class="btn btn-sm"
            @click="handleFlushSmartWeights"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </SettingItem>
        <div
          v-if="!isSingBoxCore || displayAllFeatures"
          class="col-span-full space-y-1.5"
        >
          <div
            class="tooltip w-full"
            :data-tip="$t('fullRefreshTip')"
          >
            <button
              class="btn btn-primary btn-sm relative w-full overflow-hidden"
              :disabled="isFullRefreshing"
              @click="handleFullRefresh"
            >
              <div
                v-if="isFullRefreshing || fullRefreshLogs.length > 0"
                class="absolute inset-y-0 left-0 transition-[width] duration-300 ease-linear"
                :class="fullRefreshHasWarning ? 'bg-warning/30' : 'bg-blue-500/40'"
                :style="{ width: fullRefreshProgress + '%' }"
              />
              <span class="relative flex items-center gap-1.5">
                <span
                  v-if="isFullRefreshing"
                  class="loading loading-spinner loading-sm"
                />
                {{ $t('fullRefresh') }}
              </span>
            </button>
          </div>

          <div
            v-if="isFullRefreshing || fullRefreshLogs.length > 0"
            class="space-y-1"
          >
            <div
              v-for="log in fullRefreshLogs"
              :key="log.key"
              class="flex items-start gap-1.5 text-xs"
            >
              <span
                v-if="log.status === 'running'"
                class="loading loading-spinner loading-xs mt-px shrink-0"
              />
              <span
                v-else
                class="mt-px shrink-0 leading-none font-bold"
                :class="{
                  'text-success': log.status === 'success',
                  'text-warning': log.status === 'warning',
                  'text-error': log.status === 'error',
                }"
                >{{ log.status === 'success' ? '✓' : log.status === 'warning' ? '⚠' : '✕' }}</span
              >
              <span
                :class="{
                  'text-base-content/50': log.status === 'running',
                  'text-success': log.status === 'success',
                  'text-warning': log.status === 'warning',
                  'text-error': log.status === 'error',
                }"
                >{{ log.text }}</span
              >
            </div>
          </div>
        </div>
      </template>

      <SettingItem
        :setting-key="k.DNSQuery"
        :when="!isSingboxBackend"
        class="py-3"
      >
        <div class="flex w-full flex-col">
          <div class="settings-section-label">
            {{ $t('DNSQuery') }}
          </div>
          <DnsQuery />
        </div>
      </SettingItem>

      <div class="setting-item flex-col items-start py-3">
        <div class="settings-section-label mb-2">
          {{ $t('ipCheckTools') }}
        </div>
        <div class="w-full space-y-1.5">
          <a
            v-for="site in ipCheckSitesResolved"
            :key="site.url"
            :href="site.url"
            target="_blank"
            rel="noopener noreferrer"
            class="group bg-base-200/60 hover:bg-base-200 flex items-center gap-3 rounded-lg px-3 py-2 transition-colors"
          >
            <div class="flex w-28 shrink-0 items-center">
              <img
                v-if="site.logo && !logoErrors.includes(site.url)"
                :src="site.logo"
                :alt="site.label"
                class="h-5 max-w-[88px] object-contain object-left"
                @error="() => logoErrors.push(site.url)"
              />
              <span
                v-else
                class="text-xs font-semibold"
                >{{ site.label }}</span
              >
            </div>
            <div
              v-if="site.chain.length"
              class="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden text-xs"
            >
              <template
                v-for="(node, i) in site.chain"
                :key="node"
              >
                <span
                  v-if="i > 0"
                  class="text-base-content/30 shrink-0"
                  >›</span
                >
                <span
                  class="truncate"
                  :class="{
                    'text-success font-medium': node === 'DIRECT',
                    'text-error font-medium': node === 'REJECT',
                    'text-base-content/50':
                      i < site.chain.length - 1 && node !== 'DIRECT' && node !== 'REJECT',
                    'text-base-content font-medium':
                      i === site.chain.length - 1 && node !== 'DIRECT' && node !== 'REJECT',
                  }"
                  >{{ node }}</span
                >
              </template>
            </div>
            <span
              v-else
              class="text-base-content/30 flex-1 text-xs"
              >—</span
            >
            <span
              class="text-base-content/30 group-hover:text-base-content/60 shrink-0 text-xs transition-colors"
              >↗</span
            >
          </a>
        </div>
      </div>
    </div>

    <div
      v-if="!isSingBoxCore && configs && hasVisibleSettings"
      class="grid"
    >
      <div class="settings-section-label">
        {{ $t('settings') }}
      </div>
      <div class="settings-grid">
        <SettingItem
          :setting-key="k.ports"
          class="py-3"
        >
          <div class="flex w-full flex-col">
            <BackendPortsGrid />
          </div>
        </SettingItem>
        <SettingItem
          :setting-key="k.tunMode"
          :when="!!configs?.tun && !activeBackend?.disableTunMode"
        >
          <div class="setting-item-label">
            {{ $t('tunMode') }}
          </div>
          <input
            class="toggle"
            type="checkbox"
            v-model="configs!.tun.enable"
            @change="hanlderTunModeChange"
          />
        </SettingItem>
        <SettingItem
          :setting-key="k.allowLan"
          :when="!!configs"
        >
          <div class="setting-item-label">
            {{ $t('allowLan') }}
          </div>
          <input
            class="toggle"
            type="checkbox"
            v-model="configs!['allow-lan']"
            @change="handlerAllowLanChange"
          />
        </SettingItem>
        <template v-if="!activeBackend?.disableUpgradeCore">
          <SettingItem :setting-key="k.checkCoreUpgrade">
            <div class="setting-item-label">
              {{ $t('checkCoreUpgrade') }}
            </div>
            <input
              class="toggle"
              type="checkbox"
              v-model="checkUpgradeCore"
              @change="handlerCheckUpgradeCoreChange"
            />
          </SettingItem>
          <SettingItem
            :setting-key="k.autoUpgradeCore"
            :when="checkUpgradeCore"
          >
            <div class="setting-item-label">
              {{ $t('autoUpgradeCore') }}
            </div>
            <input
              class="toggle"
              type="checkbox"
              v-model="autoUpgradeCore"
            />
          </SettingItem>
        </template>
      </div>
    </div>

    <UpgradeCoreModal v-model="showUpgradeCoreModal" />
    <UpdateConfigModal v-model="showUpdateConfigModal" />
  </div>
</template>

<script setup lang="ts">
import {
  flushDNSCacheAPI,
  flushFakeIPAPI,
  reloadConfigsAPI,
  updateGeoDataAPI,
  updateProxyProviderAPI,
  updateRuleProviderAPI,
} from '@/api'
import { isCoreUpdateAvailable, isSingBoxCore, mihomo, restartCoreAPI } from '@/assembly/version'
import BackendVersion from '@/components/common/BackendVersion.vue'
import BackendPortsGrid from '@/components/settings/backend/BackendPortsGrid.vue'
import BackendSwitch from '@/components/settings/backend/BackendSwitch.vue'
import DnsQuery from '@/components/settings/backend/DnsQuery.vue'
import { isSingboxBackend } from '@/assembly/backend'
import SettingItem from '@/components/settings/SettingItem.vue'
import { isSettingVisible, useIsSettingVisible } from '@/composables/settings'
import { BACKEND_ITEM_KEYS } from '@/config/settingsItems'
import { MIHOMO, MIHOMO_CHANNEL } from '@/constant'
import { showNotification } from '@/helper/notification'
import {
  fetchProxies,
  flushSmartGroupWeightsAPI,
  hasSmartGroup,
  proxyMap,
  proxyProviederList,
} from '@/assembly/proxies'
import { configs, fetchConfigs, updateConfigs } from '@/assembly/config'
import { fetchRules, ruleProviderList, rules } from '@/assembly/rules'
import { autoUpgradeCore, checkUpgradeCore, displayAllFeatures } from '@/store/settings'
import { activeBackend } from '@/store/setup'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowPathRoundedSquareIcon,
  ArrowUpCircleIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UpdateConfigModal from './UpdateConfigModal.vue'
import UpgradeCoreModal from './UpgradeCoreModal.vue'

const IP_CHECK_SITES = [
  {
    label: 'ipleak.net',
    url: 'https://ipleak.net',
    logo: 'https://ipleak.net/static/images/logotitle.png',
  },
  {
    label: 'ipapi.co',
    url: 'https://ipapi.co',
    logo: 'https://avatars.githubusercontent.com/u/18582121?v=4',
  },
  { label: 'ugtop.com', url: 'https://ugtop.com', logo: 'https://ugtop.com/title2002.gif' },
  { label: 'myip.com', url: 'https://myip.com', logo: 'https://www.myip.com/img/myip.png' },
  { label: 'ippure.com', url: 'https://ippure.com', logo: 'https://ippure.com/logo.png' },
  {
    label: 'ping0.cc',
    url: 'https://ping0.cc',
    logo: 'https://tarticle-new.oss-cn-shenzhen.aliyuncs.com/article/small_ping0_98e5ebb4ce.png',
  },
]

const logoErrors = ref<string[]>([])

const PROXY_GROUP_TYPES = new Set(['Selector', 'URLTest', 'Fallback', 'LoadBalance', 'Smart'])

const resolveProxyChain = (name: string): string[] => {
  const chain: string[] = []
  const visited = new Set<string>()
  let cur = name
  while (cur && !visited.has(cur)) {
    visited.add(cur)
    chain.push(cur)
    const p = proxyMap.value[cur]
    if (!p || !PROXY_GROUP_TYPES.has(p.type) || !p.now) break
    cur = p.now
  }
  return chain
}

const matchDomain = (domain: string) => {
  for (const rule of rules.value) {
    switch (rule.type) {
      case 'DOMAIN':
        if (domain === rule.payload) return rule
        break
      case 'DOMAIN-SUFFIX':
        if (domain === rule.payload || domain.endsWith('.' + rule.payload)) return rule
        break
      case 'DOMAIN-KEYWORD':
        if (domain.includes(rule.payload)) return rule
        break
      case 'MATCH':
        return rule
    }
  }
  return null
}

const ipCheckSitesResolved = computed(() =>
  IP_CHECK_SITES.map((site) => {
    const domain = new URL(site.url).hostname
    const matched = matchDomain(domain)
    const chain = matched ? resolveProxyChain(matched.proxy) : []
    return { ...site, chain }
  }),
)

const { t } = useI18n()
const k = BACKEND_ITEM_KEYS
const isVisibleBackendSwitch = useIsSettingVisible(k.backend)
const isVisiblePorts = useIsSettingVisible(k.ports)
const isVisibleTunMode = useIsSettingVisible(k.tunMode)
const isVisibleAllowLan = useIsSettingVisible(k.allowLan)
const isVisibleCheckUpgrade = useIsSettingVisible(k.checkCoreUpgrade)
const isVisibleAutoUpgrade = useIsSettingVisible(k.autoUpgradeCore)
const isVisibleDnsQuery = useIsSettingVisible(k.DNSQuery)
const canShowTunMode = computed(
  () => isVisibleTunMode.value && !activeBackend.value?.disableTunMode,
)

/** sing-box 内核下只保留 flush 类操作，除非用户开启了「显示全部功能」 */
const canShowCoreActions = computed(() => !isSingBoxCore.value || displayAllFeatures.value)

/** 当前后端/内核下实际可渲染的操作项 */
const renderableActionKeys = computed(() => {
  if (isSingboxBackend.value) return []

  const keys: string[] = []

  if (canShowCoreActions.value) {
    if (!activeBackend.value?.disableUpgradeCore) keys.push(k.upgradeCore)
    keys.push(k.restartCore, k.reloadConfigs)
    if (!isSingBoxCore.value) keys.push(k.updateConfigs)
    keys.push(k.updateGeoDatabase)
  }
  keys.push(k.flushDNSCache, k.flushFakeIP)
  if (hasSmartGroup.value) keys.push(k.flushSmartWeights)

  return keys
})

const hasVisibleActions = computed(() => renderableActionKeys.value.some(isSettingVisible))

const hasVisibleItems = computed(() => {
  return (
    isVisibleBackendSwitch.value ||
    hasVisibleSettings.value ||
    hasVisibleActions.value ||
    isVisibleDnsQuery.value
  )
})

const hasVisibleSettings = computed(() => {
  return (
    !isSingBoxCore.value &&
    !!configs.value &&
    (isVisiblePorts.value ||
      (configs.value.tun && canShowTunMode.value) ||
      isVisibleAllowLan.value ||
      (!activeBackend.value?.disableUpgradeCore &&
        (isVisibleCheckUpgrade.value || (checkUpgradeCore.value && isVisibleAutoUpgrade.value))))
  )
})

const reloadAll = () => {
  fetchConfigs()
  fetchRules()
  fetchProxies()
}

const showUpgradeCoreModal = ref(false)
const showUpdateConfigModal = ref(false)

const isCoreRestarting = ref(false)
const handlerClickRestartCore = async () => {
  if (isCoreRestarting.value) return
  isCoreRestarting.value = true
  try {
    await restartCoreAPI()
    setTimeout(() => {
      reloadAll()
    }, 500)
    isCoreRestarting.value = false
    showNotification({
      content: 'restartCoreSuccess',
      type: 'alert-success',
    })
  } catch {
    isCoreRestarting.value = false
  }
}

const isConfigReloading = ref(false)
const handlerClickReloadConfigs = async () => {
  if (isConfigReloading.value) return
  isConfigReloading.value = true
  try {
    await reloadConfigsAPI()
    reloadAll()
    isConfigReloading.value = false
    showNotification({
      content: 'reloadConfigsSuccess',
      type: 'alert-success',
    })
  } catch {
    isConfigReloading.value = false
  }
}

const isGeoUpdating = ref(false)
const handlerClickUpdateGeo = async () => {
  if (isGeoUpdating.value) return
  isGeoUpdating.value = true
  try {
    await updateGeoDataAPI()
    reloadAll()
    isGeoUpdating.value = false
    showNotification({
      content: 'updateGeoSuccess',
      type: 'alert-success',
    })
  } catch {
    isGeoUpdating.value = false
  }
}

const handlerCheckUpgradeCoreChange = () => {
  if (!checkUpgradeCore.value) {
    autoUpgradeCore.value = false
    isCoreUpdateAvailable.value = false
  }
}

const hanlderTunModeChange = async () => {
  await updateConfigs({ tun: { enable: configs.value?.tun.enable } })
}
const handlerAllowLanChange = async () => {
  await updateConfigs({ ['allow-lan']: configs.value?.['allow-lan'] })
}

const handleFlushDNSCache = async () => {
  await flushDNSCacheAPI()
  showNotification({
    content: 'flushDNSCacheSuccess',
    type: 'alert-success',
  })
}

const handleFlushFakeIP = async () => {
  await flushFakeIPAPI()
  showNotification({
    content: 'flushFakeIPSuccess',
    type: 'alert-success',
  })
}

const handleFlushSmartWeights = async () => {
  await flushSmartGroupWeightsAPI()
  showNotification({
    content: 'flushSmartWeightsSuccess',
    type: 'alert-success',
  })
}

interface LogEntry {
  key: string
  text: string
  status: 'running' | 'success' | 'warning' | 'error'
}

const isFullRefreshing = ref(false)
const fullRefreshProgress = ref(0)
const fullRefreshLogs = ref<LogEntry[]>([])
const fullRefreshHasWarning = computed(() =>
  fullRefreshLogs.value.some((l) => l.status === 'warning'),
)

const pushLog = (entry: LogEntry) => fullRefreshLogs.value.push(entry)
const patchLog = (key: string, updates: Partial<LogEntry>) => {
  const idx = fullRefreshLogs.value.findIndex((l) => l.key === key)
  if (idx >= 0) fullRefreshLogs.value[idx] = { ...fullRefreshLogs.value[idx], ...updates }
}

const handleFullRefresh = async () => {
  if (isFullRefreshing.value) return
  isFullRefreshing.value = true
  fullRefreshProgress.value = 0
  fullRefreshLogs.value = []

  try {
    const proxyList = proxyProviederList.value
    const ruleList = ruleProviderList.value
    const totalUnits = proxyList.length + ruleList.length + 2
    let doneUnits = 0
    const advance = () => {
      doneUnits++
      fullRefreshProgress.value = Math.min(
        99,
        Math.round((doneUnits / Math.max(totalUnits, 1)) * 100),
      )
    }

    // Step 1: proxy providers
    if (proxyList.length > 0) {
      pushLog({ key: 'proxies', text: t('fullRefreshStepProxies'), status: 'running' })
      let proxyDone = 0
      const proxyFailed: string[] = []
      await Promise.allSettled(
        proxyList.map(async (p) => {
          try {
            await updateProxyProviderAPI(p.name)
          } catch {
            proxyFailed.push(p.name)
          } finally {
            proxyDone++
            advance()
            patchLog('proxies', {
              text: t('fullRefreshProxiesUpdating', { done: proxyDone, total: proxyList.length }),
              status: proxyFailed.length > 0 ? 'warning' : 'running',
            })
          }
        }),
      )
      const proxySuccess = proxyList.length - proxyFailed.length
      patchLog('proxies', {
        text:
          proxyFailed.length > 0
            ? t('fullRefreshProxiesPartial', {
                success: proxySuccess,
                total: proxyList.length,
                failed: proxyFailed.join(', '),
              })
            : t('fullRefreshProxiesDone', { success: proxySuccess, total: proxyList.length }),
        status: proxyFailed.length > 0 ? 'warning' : 'success',
      })
    }

    // Step 2: rule providers
    if (ruleList.length > 0) {
      pushLog({ key: 'rules', text: t('fullRefreshStepRules'), status: 'running' })
      let ruleDone = 0
      const ruleFailed: string[] = []
      await Promise.allSettled(
        ruleList.map(async (r) => {
          try {
            await updateRuleProviderAPI(r.name)
          } catch {
            ruleFailed.push(r.name)
          } finally {
            ruleDone++
            advance()
            patchLog('rules', {
              text: t('fullRefreshRulesUpdating', { done: ruleDone, total: ruleList.length }),
              status: ruleFailed.length > 0 ? 'warning' : 'running',
            })
          }
        }),
      )
      const ruleSuccess = ruleList.length - ruleFailed.length
      patchLog('rules', {
        text:
          ruleFailed.length > 0
            ? t('fullRefreshRulesPartial', {
                success: ruleSuccess,
                total: ruleList.length,
                failed: ruleFailed.join(', '),
              })
            : t('fullRefreshRulesDone', { success: ruleSuccess, total: ruleList.length }),
        status: ruleFailed.length > 0 ? 'warning' : 'success',
      })
    }

    // Step 3: reload config
    pushLog({ key: 'reload', text: t('fullRefreshStepReload'), status: 'running' })
    try {
      await reloadConfigsAPI()
      advance()
      patchLog('reload', { text: t('fullRefreshReloadDone'), status: 'success' })
    } catch {
      advance()
      patchLog('reload', { text: t('fullRefreshReloadFailed'), status: 'error' })
    }

    // Step 4: flush caches
    pushLog({ key: 'cache', text: t('fullRefreshStepCache'), status: 'running' })
    try {
      await Promise.all([flushFakeIPAPI(), flushDNSCacheAPI()])
    } finally {
      advance()
      fullRefreshProgress.value = 100
      patchLog('cache', { text: t('fullRefreshCacheDone'), status: 'success' })
    }

    reloadAll()

    if (!fullRefreshHasWarning.value) {
      showNotification({ content: 'fullRefreshSuccess', type: 'alert-success' })
    }
  } finally {
    isFullRefreshing.value = false
    setTimeout(() => {
      fullRefreshProgress.value = 0
      fullRefreshLogs.value = []
    }, 3000)
  }
}
</script>
