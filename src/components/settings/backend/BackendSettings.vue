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
            isSingBox
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
      <div
        v-if="isVisibleBackendSwitch"
        class="setting-item p-4"
      >
        <BackendSwitch />
      </div>

      <div
        v-if="isVisibleActions"
        class="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-2"
      >
        <template v-if="!isSingBox || displayAllFeatures">
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
            v-if="!isSingBox"
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
          v-if="!isSingBox || displayAllFeatures"
          class="col-span-full space-y-2"
        >
          <div
            class="tooltip w-full"
            :data-tip="$t('fullRefreshTip')"
          >
            <button
              class="btn btn-primary btn-sm w-full"
              :disabled="isFullRefreshing"
              @click="handleFullRefresh"
            >
              <span
                v-if="isFullRefreshing"
                class="loading loading-spinner loading-sm"
              ></span>
              {{ $t('fullRefresh') }}
            </button>
          </div>

          <template v-if="isFullRefreshing || fullRefreshLogs.length > 0">
            <progress
              class="progress h-1.5 w-full transition-all duration-300"
              :class="fullRefreshHasWarning ? 'progress-warning' : 'progress-primary'"
              :value="fullRefreshProgress"
              max="100"
            />
            <div class="space-y-1">
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
          </template>
        </div>
      </div>

      <div
        v-if="isVisibleDnsQuery"
        class="setting-item flex-col items-start py-3"
      >
        <div class="flex w-full flex-col">
          <div class="settings-section-label">
            {{ $t('DNSQuery') }}
          </div>
          <DnsQuery />
        </div>
      </div>

      <div class="setting-item flex-col items-start py-3">
        <div class="settings-section-label mb-2">
          {{ $t('ipCheckTools') }}
        </div>
        <div class="divide-base-content/10 w-full divide-y">
          <div
            v-for="site in ipCheckSitesResolved"
            :key="site.url"
            class="flex items-center gap-2 py-1.5 text-xs"
          >
            <a
              :href="site.url"
              target="_blank"
              rel="noopener noreferrer"
              class="link link-hover w-32 shrink-0 font-medium"
            >
              {{ site.label }}
            </a>
            <div
              v-if="site.chain.length"
              class="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden"
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
              class="text-base-content/30"
              >—</span
            >
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="!isSingBox && configs && hasVisibleSettings"
      class="grid"
    >
      <div class="settings-section-label">
        {{ $t('settings') }}
      </div>
      <div class="settings-grid">
        <BackendPortsGrid v-if="isVisiblePorts" />
        <div
          v-if="configs?.tun && canShowTunMode"
          class="setting-item"
        >
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
          v-if="isVisibleAllowLan"
          class="setting-item"
        >
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
          <div
            v-if="isVisibleCheckUpgrade"
            class="setting-item"
          >
            <div class="setting-item-label">
              {{ $t('checkCoreUpgrade') }}
            </div>
            <input
              class="toggle"
              type="checkbox"
              v-model="checkUpgradeCore"
              @change="handlerCheckUpgradeCoreChange"
            />
          </div>
          <div
            v-if="checkUpgradeCore && isVisibleAutoUpgrade"
            class="setting-item"
          >
            <div class="setting-item-label">
              {{ $t('autoUpgradeCore') }}
            </div>
            <input
              class="toggle"
              type="checkbox"
              v-model="autoUpgradeCore"
            />
          </div>
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
  flushSmartGroupWeightsAPI,
  isCoreUpdateAvailable,
  isSingBox,
  mihomo,
  reloadConfigsAPI,
  restartCoreAPI,
  updateGeoDataAPI,
  updateProxyProviderAPI,
  updateRuleProviderAPI,
} from '@/api'
import BackendVersion from '@/components/common/BackendVersion.vue'
import BackendPortsGrid from '@/components/settings/backend/BackendPortsGrid.vue'
import BackendSwitch from '@/components/settings/backend/BackendSwitch.vue'
import DnsQuery from '@/components/settings/backend/DnsQuery.vue'
import { useIsSettingVisible } from '@/composables/settings'
import { BACKEND_ITEM_KEYS } from '@/config/settingsItems'
import { MIHOMO, MIHOMO_CHANNEL } from '@/constant'
import { showNotification } from '@/helper/notification'
import { configs, fetchConfigs, updateConfigs } from '@/store/config'
import { fetchProxies, hasSmartGroup, proxyMap, proxyProviederList } from '@/store/proxies'
import { fetchRules, ruleProviderList, rules } from '@/store/rules'
import { autoUpgradeCore, checkUpgradeCore, displayAllFeatures } from '@/store/settings'
import { activeBackend } from '@/store/setup'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UpdateConfigModal from './UpdateConfigModal.vue'
import UpgradeCoreModal from './UpgradeCoreModal.vue'

const IP_CHECK_SITES = [
  { label: 'ipleak.net', url: 'https://ipleak.net' },
  { label: 'dnsleaktest.com', url: 'https://dnsleaktest.com' },
  { label: 'ipapi.co', url: 'https://ipapi.co' },
  { label: 'ugtop.com', url: 'https://ugtop.com' },
  { label: 'myip.com', url: 'https://myip.com' },
  { label: 'ippure.com', url: 'https://ippure.com' },
  { label: 'ping0.cc', url: 'https://ping0.cc' },
]

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
    !isSingBox.value &&
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
  }
}
</script>
