<template>
  <div
    class="h-full overflow-x-hidden overflow-y-auto"
    :style="padding"
  >
    <CtrlsBar>
      <div class="flex h-12 items-center gap-2 p-2 text-sm">
        <span class="truncate font-semibold">{{ $t('shlii') }}</span>
        <span
          v-if="updatedLabel"
          class="text-base-content/40 hidden truncate text-xs sm:inline"
        >
          {{ updatedLabel }}
        </span>
        <span
          v-if="shliiUsageRefreshing"
          class="text-base-content/30 hidden text-[11px] sm:inline"
        >
          · {{ $t('shliiRefreshing') }}
        </span>
        <div class="ml-auto flex shrink-0 items-center gap-1">
          <button
            class="btn btn-circle btn-ghost btn-sm"
            :class="{ 'animate-spin': shliiUsageLoading }"
            :title="$t('refresh')"
            :disabled="shliiUsageLoading || !hasShliiUsageUrl"
            @click="refreshShliiUsage(true)"
          >
            <ArrowPathIcon class="h-4 w-4" />
          </button>
          <button
            class="btn btn-circle btn-ghost btn-sm"
            :title="$t('settings')"
            @click="configOpen = !configOpen"
          >
            <Cog6ToothIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </CtrlsBar>

    <div class="flex flex-col gap-3 p-3">
      <section
        v-if="configOpen || !hasShliiUsageUrl"
        class="base-container flex flex-col gap-2 p-4"
      >
        <p class="text-base-content/50 text-xs">{{ $t('shliiUsageHint') }}</p>
        <form
          class="join w-full max-w-2xl"
          @submit.prevent="saveUsageUrl"
        >
          <input
            v-model="urlDraft"
            class="input input-sm join-item min-w-0 flex-1 font-mono"
            :placeholder="placeholder"
            autocomplete="off"
            spellcheck="false"
          />
          <button
            type="submit"
            class="btn join-item btn-sm"
            :disabled="!urlDraft.trim()"
          >
            {{ $t('save') }}
          </button>
        </form>
      </section>

      <div
        v-if="errorLabel"
        class="alert alert-error alert-soft text-sm"
        role="alert"
      >
        <ExclamationTriangleIcon class="h-4 w-4 shrink-0" />
        <span>{{ errorLabel }}</span>
      </div>

      <div
        v-if="hasShliiUsageUrl && shliiUsage"
        class="grid auto-rows-min grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <section class="base-container flex flex-col justify-between gap-2 p-4">
          <div class="text-base-content/40 text-xs tracking-wider uppercase">
            {{ $t('shliiBalance') }}
          </div>
          <div class="flex items-baseline gap-1.5">
            <span class="text-3xl font-extralight tabular-nums">¥ {{ balanceLabel }}</span>
          </div>
          <div class="text-base-content/30 truncate text-[11px]">
            {{ $t('shliiAccount') }}
          </div>
        </section>

        <section class="base-container flex flex-col justify-between gap-2 p-4">
          <div class="text-base-content/40 text-xs tracking-wider uppercase">
            {{ $t('shliiInstances') }}
          </div>
          <div class="flex items-baseline gap-1.5">
            <span class="text-3xl font-extralight tabular-nums">{{ instances.length }}</span>
            <span class="text-base-content/50 text-sm">
              {{ $t('shliiRunningInstances') }} {{ runningCount }}
            </span>
          </div>
          <div class="text-base-content/30 truncate text-[11px]">
            {{ instanceNames }}
          </div>
        </section>

        <section class="base-container flex flex-col gap-2 p-4 sm:col-span-2">
          <div class="flex items-center justify-between">
            <div class="text-base-content/40 text-xs tracking-wider uppercase">
              {{ $t('shliiTrafficUsed') }}
            </div>
            <div class="text-base-content/40 text-xs tabular-nums">{{ totalPercentage }}%</div>
          </div>
          <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span class="text-3xl font-extralight tabular-nums">{{ totalUsedLabel }}</span>
            <span class="text-base-content/40 text-sm">/ {{ totalLimitLabel }}</span>
            <span class="text-base-content/30 ml-auto text-[11px] tabular-nums">
              {{ $t('remainingTraffic') }}: {{ totalRemainingLabel }}
            </span>
          </div>
          <progress
            v-if="limited"
            class="progress h-2 w-full"
            :class="progressClassFor(totalPercentage)"
            :value="totalPercentage"
            max="100"
          ></progress>
        </section>

        <article
          v-for="instance in instances"
          :key="instance.id"
          class="base-container flex flex-col gap-3 p-4 sm:col-span-2"
        >
          <header class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 flex-wrap items-center gap-2">
              <h3 class="truncate text-sm font-semibold">{{ instance.name }}</h3>
              <span
                class="badge badge-xs shrink-0"
                :class="instance.status === 'running' ? 'badge-success' : 'badge-ghost'"
              >
                {{ statusLabel(instance) }}
              </span>
              <span
                v-if="instance.autoRenew"
                class="badge badge-outline badge-xs shrink-0 opacity-60"
              >
                {{ $t('shliiAutoRenew') }}
              </span>
            </div>
            <div class="shrink-0 text-right">
              <div class="text-base-content/40 text-[10px] tracking-wider uppercase">
                {{ $t('shliiExpiresAt') }}
              </div>
              <div class="text-xs tabular-nums">{{ expireLabel(instance) }}</div>
            </div>
          </header>

          <div class="flex flex-wrap items-center gap-1.5">
            <span class="badge badge-ghost badge-sm font-mono tabular-nums">
              {{ specLabel(instance) }}
            </span>
            <span class="badge badge-ghost badge-sm font-mono">{{ imageLabel(instance) }}</span>
            <span class="badge badge-ghost badge-sm font-mono">#{{ instance.id }}</span>
          </div>

          <div class="flex flex-col gap-1.5">
            <div class="flex items-baseline justify-between gap-2 text-xs">
              <span class="text-base-content/50">{{ $t('shliiTrafficUsed') }}</span>
              <span class="tabular-nums">
                <span class="text-sm font-medium">{{ usedLabel(instance) }}</span>
                <span class="text-base-content/40"> / {{ limitLabel(instance) }}</span>
              </span>
            </div>
            <progress
              v-if="percentage(instance) !== null"
              class="progress h-1.5 w-full"
              :class="progressClassFor(percentage(instance) ?? 0)"
              :value="percentage(instance) ?? 0"
              max="100"
            ></progress>
            <div
              class="text-base-content/40 flex items-center justify-between text-[11px] tabular-nums"
            >
              <span>{{ $t('remainingTraffic') }}: {{ remainingLabel(instance) }}</span>
              <span v-if="percentage(instance) !== null">{{ percentage(instance) }}%</span>
            </div>
          </div>

          <dl
            v-if="networkFields(instance).length"
            class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs"
          >
            <template
              v-for="field in networkFields(instance)"
              :key="field.label"
            >
              <dt class="text-base-content/40">{{ field.label }}</dt>
              <dd class="flex min-w-0 items-center gap-1">
                <span class="truncate font-mono">{{ field.value }}</span>
                <button
                  v-if="field.copyable"
                  type="button"
                  class="btn btn-ghost btn-circle btn-xs h-5 min-h-5 w-5 shrink-0 p-0 opacity-50 hover:opacity-100"
                  :title="$t('copy')"
                  @click="copy(field.value)"
                >
                  <ClipboardDocumentIcon class="h-3 w-3" />
                </button>
              </dd>
            </template>
          </dl>
        </article>

        <section
          v-if="shliiUsage.regions.length"
          class="base-container flex flex-col gap-2 p-4 sm:col-span-2"
        >
          <div class="text-base-content/40 text-xs tracking-wider uppercase">
            {{ $t('shliiRegions') }}
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="region in shliiUsage.regions"
              :key="`${region.countryCode}-${region.location}`"
              class="badge badge-ghost badge-sm"
            >
              <span class="font-mono uppercase">{{ region.countryCode }}</span>
              <span class="text-base-content/60">{{ region.location }}</span>
            </span>
          </div>
        </section>
      </div>

      <div
        v-else-if="hasShliiUsageUrl"
        class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div
          v-for="n in 4"
          :key="n"
          class="base-container skeleton h-28"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShliiUsageInstance } from '@/modules/shlii/api'
import {
  hasShliiUsageUrl,
  refreshShliiUsage,
  resetShliiUsage,
  shliiUsage,
  shliiUsageError,
  shliiUsageFetchedAt,
  shliiUsageInstances as instances,
  shliiUsageLoading,
  shliiUsagePercentage as totalPercentage,
  shliiUsageRefreshing,
  shliiUsageRunning as runningCount,
} from '@/modules/shlii/state'
import CtrlsBar from '@/components/common/CtrlsBar.vue'
import { usePaddingForViews } from '@/composables/use-padding-for-views'
import { showNotification } from '@/helper/notification'
import { prettyBytesHelper } from '@/helper/utils'
import { shliiUsageUrl } from '@/modules/shlii/store'
import {
  ArrowPathIcon,
  ClipboardDocumentIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import dayjs from 'dayjs'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { padding } = usePaddingForViews()

const configOpen = ref(false)
const urlDraft = ref(shliiUsageUrl.value)
const placeholder = 'https://sub.example.com/subscribe/<token>/usage'

const updatedLabel = computed(() => {
  if (!shliiUsageFetchedAt.value) return ''

  return t('shliiUpdatedAt', { time: dayjs(shliiUsageFetchedAt.value).format('HH:mm:ss') })
})

const balanceLabel = computed(() => Number(shliiUsage.value?.balance ?? 0).toFixed(2))
const limited = computed(() => (shliiUsage.value?.limit ?? 0) > 0)
const instanceNames = computed(() => instances.value.map((instance) => instance.name).join(' · '))

const totalUsedLabel = computed(() =>
  prettyBytesHelper(shliiUsage.value?.used ?? 0, { binary: true }),
)

const totalLimitLabel = computed(() =>
  limited.value
    ? prettyBytesHelper(shliiUsage.value?.limit ?? 0, { binary: true })
    : t('shliiTrafficUnlimited'),
)

const totalRemainingLabel = computed(() => {
  if (!limited.value) return t('shliiTrafficUnlimited')

  const { used = 0, limit = 0 } = shliiUsage.value ?? {}

  return prettyBytesHelper(Math.max(0, limit - used), { binary: true })
})

const progressClassFor = (percentage: number) => {
  if (percentage >= 90) return 'progress-error'
  if (percentage >= 70) return 'progress-warning'

  return 'progress-success'
}

const errorLabel = computed(() => {
  switch (shliiUsageError.value) {
    case 'unauthorized':
      return t('shliiUsageUnauthorized')
    case 'unavailable':
      return t('shliiUsageUnavailable')
    case 'network':
      return t('shliiUsageNetwork')
    case 'unknown':
      return t('shliiUsageUnknown')
    default:
      return ''
  }
})

const saveUsageUrl = () => {
  shliiUsageUrl.value = urlDraft.value.trim()

  resetShliiUsage()
  configOpen.value = false
  void refreshShliiUsage(true)
}

const statusLabel = (instance: ShliiUsageInstance) => {
  if (instance.status === 'running') return t('online')
  if (instance.status === 'stopped') return t('offline')

  return instance.status
}

const imageLabel = (instance: ShliiUsageInstance) => instance.image.replace(/^images:/, '')

const specLabel = (instance: ShliiUsageInstance) => {
  const cores = Number((instance.cpu / 100).toFixed(2))

  return `${cores} vCPU · ${prettyBytesHelper(instance.memory * 1024 * 1024, { binary: true })} · ${prettyBytesHelper(instance.disk * 1024 * 1024, { binary: true })}`
}

const expireLabel = (instance: ShliiUsageInstance) => {
  if (!instance.expiresAt) return t('shliiLongTerm')

  return dayjs(instance.expiresAt).format('YYYY-MM-DD')
}

const usedLabel = (instance: ShliiUsageInstance) =>
  prettyBytesHelper(instance.used, { binary: true })

const limitLabel = (instance: ShliiUsageInstance) =>
  instance.limit === null || instance.limit <= 0
    ? t('shliiTrafficUnlimited')
    : prettyBytesHelper(instance.limit, { binary: true })

const remainingLabel = (instance: ShliiUsageInstance) => {
  if (instance.limit === null || instance.limit <= 0) return t('shliiTrafficUnlimited')

  return prettyBytesHelper(Math.max(0, instance.limit - instance.used), { binary: true })
}

const percentage = (instance: ShliiUsageInstance): number | null => {
  if (instance.limit === null || instance.limit <= 0) return null

  return Number(((instance.used / instance.limit) * 100).toFixed(2))
}

const networkFields = (instance: ShliiUsageInstance) =>
  [
    { label: t('shliiPublicIpv4'), value: instance.publicIpv4, copyable: true },
    { label: t('shliiPublicIpv6'), value: instance.publicIpv6, copyable: true },
    { label: t('shliiPrivateIpv4'), value: instance.ipv4, copyable: false },
    {
      label: t('shliiSshPort'),
      value: instance.sshPort === undefined ? undefined : String(instance.sshPort),
      copyable: false,
    },
    { label: t('shliiNetworkMode'), value: instance.networkMode, copyable: false },
  ].filter((field): field is { label: string; value: string; copyable: boolean } =>
    Boolean(field.value),
  )

const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    showNotification({
      content: 'copySuccess',
      type: 'alert-success',
      timeout: 2000,
    })
  } catch {
    // Clipboard is unavailable in non-secure contexts; keep the page usable.
  }
}

onMounted(() => {
  if (!hasShliiUsageUrl.value) {
    configOpen.value = true

    return
  }

  void refreshShliiUsage()
})
</script>
