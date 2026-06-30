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
      v-if="isVisibleActions || isVisibleBackendSwitch || isVisibleDnsQuery"
    >
      <SettingItem
        :setting-key="k.backend"
        class="p-4"
      >
        <BackendSwitch />
      </SettingItem>

      <div
        v-if="isVisibleActions && !isSingboxBackend"
        class="relative"
        :class="settingsEditMode && isSettingHidden(k.actions) ? 'opacity-40' : ''"
      >
        <SettingVisibilityToggle
          :setting-key="k.actions"
          class="absolute top-2 left-2 z-10"
        />
        <div class="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-2">
          <template v-if="!isSingBoxCore || displayAllFeatures">
            <button
              v-if="!activeBackend?.disableUpgradeCore"
              class="btn btn-neutral btn-sm"
              @click="showUpgradeCoreModal = true"
            >
              {{ $t('upgradeCore') }}
            </button>
            <button
              class="btn btn-sm"
              @click="handlerClickRestartCore"
            >
              <span
                v-if="isCoreRestarting"
                class="loading loading-spinner loading-md"
              ></span>
              {{ $t('restartCore') }}
            </button>
            <button
              class="btn btn-sm"
              @click="handlerClickReloadConfigs"
            >
              <span
                v-if="isConfigReloading"
                class="loading loading-spinner loading-md"
              ></span>
              {{ $t('reloadConfigs') }}
            </button>
            <button
              v-if="!isSingBoxCore"
              class="btn btn-sm"
              @click="showUpdateConfigModal = true"
            >
              {{ $t('updateConfigs') }}
            </button>
            <button
              class="btn btn-sm"
              @click="handlerClickUpdateGeo"
            >
              <span
                v-if="isGeoUpdating"
                class="loading loading-spinner loading-md"
              ></span>
              {{ $t('updateGeoDatabase') }}
            </button>
          </template>
          <button
            class="btn btn-sm"
            @click="handleFlushDNSCache"
          >
            {{ $t('flushDNSCache') }}
          </button>
          <button
            class="btn btn-sm"
            @click="handleFlushFakeIP"
          >
            {{ $t('flushFakeIP') }}
          </button>
          <button
            v-if="hasSmartGroup"
            class="btn btn-sm"
            @click="handleFlushSmartWeights"
          >
            {{ $t('flushSmartWeights') }}
          </button>
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
        </div>
      </div>

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
        <div
          v-if="isVisiblePorts"
          class="relative"
          :class="settingsEditMode && isSettingHidden(k.ports) ? 'opacity-40' : ''"
        >
          <SettingVisibilityToggle
            :setting-key="k.ports"
            class="absolute top-1 right-1 z-10"
          />
          <BackendPortsGrid />
        </div>
        <div
          v-if="configs?.tun && canShowTunMode"
          class="setting-item"
        >
          <SettingVisibilityToggle :setting-key="k.tunMode" />
          <div class="setting-item-label">
            {{ $t('tunMode') }}
          </div>
          <input
            class="toggle"
            type="checkbox"
            v-model="configs.tun.enable"
            @change="hanlderTunModeChange"
          />
        </div>
        <div
          v-if="configs && isVisibleAllowLan"
          class="setting-item"
        >
          <SettingVisibilityToggle :setting-key="k.allowLan" />
          <div class="setting-item-label">
            {{ $t('allowLan') }}
          </div>
          <input
            class="toggle"
            type="checkbox"
            v-model="configs['allow-lan']"
            @change="handlerAllowLanChange"
          />
        </div>
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
import SettingVisibilityToggle from '@/components/settings/SettingVisibilityToggle.vue'
import { isSettingHidden, settingsEditMode, useIsSettingVisible } from '@/composables/settings'
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
    label: 'dnsleaktest.com',
    url: 'https://dnsleaktest.com',
    logo: 'https://dnsleaktest.com/assets/img/logo.png',
  },
  {
    label: 'ipapi.co',
    url: 'https://ipapi.co',
    logo: 'data:image/jpeg;base64,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',
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
const isVisibleActions = useIsSettingVisible(k.actions)
const isVisibleDnsQuery = useIsSettingVisible(k.DNSQuery)
const canShowTunMode = computed(
  () => isVisibleTunMode.value && !activeBackend.value?.disableTunMode,
)

const hasVisibleItems = computed(() => {
  return (
    isVisibleBackendSwitch.value ||
    hasVisibleSettings.value ||
    isVisibleActions.value ||
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
