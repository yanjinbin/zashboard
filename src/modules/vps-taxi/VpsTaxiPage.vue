<template>
  <div
    class="h-full overflow-x-hidden overflow-y-auto"
    :style="padding"
  >
    <CtrlsBar>
      <div class="flex h-12 items-center gap-2 p-2 text-sm">
        <span class="truncate font-semibold">{{ $t('vpsTaxi') }}</span>
        <span
          v-if="updatedLabel"
          class="text-base-content/40 hidden truncate text-xs sm:inline"
        >
          {{ updatedLabel }}
        </span>
        <span
          v-if="vpsTaxiRefreshing"
          class="text-base-content/30 hidden text-[11px] sm:inline"
        >
          · {{ $t('vpsTaxiRefreshing') }}
        </span>
        <div class="ml-auto flex shrink-0 items-center gap-1">
          <button
            class="btn btn-circle btn-ghost btn-sm"
            :class="{ 'animate-spin': vpsTaxiLoading }"
            :title="$t('refresh')"
            :disabled="vpsTaxiLoading"
            @click="refreshVpsTaxi(true)"
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
        v-if="configOpen"
        class="base-container flex flex-col gap-2 p-4"
      >
        <p class="text-base-content/50 text-xs">{{ $t('vpsTaxiHint') }}</p>
        <form
          class="flex w-full max-w-2xl flex-col gap-2"
          @submit.prevent="saveConfig"
        >
          <label class="flex flex-col gap-1">
            <span class="text-base-content/50 text-[11px]">{{ $t('vpsTaxiApiBase') }}</span>
            <input
              v-model="baseDraft"
              class="input input-sm w-full font-mono"
              :placeholder="basePlaceholder"
              autocomplete="off"
              spellcheck="false"
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-base-content/50 text-[11px]">{{ $t('vpsTaxiApiKey') }}</span>
            <div class="join w-full">
              <input
                v-model="keyDraft"
                class="input input-sm join-item min-w-0 flex-1 font-mono"
                :type="showKey ? 'text' : 'password'"
                :placeholder="$t('vpsTaxiApiKeyOptional')"
                autocomplete="off"
                spellcheck="false"
              />
              <button
                type="button"
                class="btn join-item btn-sm"
                @click="showKey = !showKey"
              >
                <EyeIcon
                  v-if="!showKey"
                  class="h-4 w-4"
                />
                <EyeSlashIcon
                  v-else
                  class="h-4 w-4"
                />
              </button>
              <button
                type="submit"
                class="btn join-item btn-sm"
                :disabled="!baseDraft.trim()"
              >
                {{ $t('save') }}
              </button>
            </div>
          </label>
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

      <template v-if="vpsTaxiSnapshot">
        <div class="grid auto-rows-min grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <section class="base-container flex flex-col justify-between gap-2 p-4 sm:col-span-2">
            <div class="flex items-center justify-between">
              <div class="text-base-content/40 text-xs tracking-wider uppercase">
                {{ $t('vpsTaxiTrafficUsed') }}
              </div>
              <div class="text-base-content/40 text-xs tabular-nums">{{ totalPercentage }}%</div>
            </div>
            <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span class="text-3xl font-extralight tabular-nums">{{ totalUsedLabel }}</span>
              <span class="text-base-content/40 text-sm">/ {{ totalQuotaLabel }}</span>
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

          <section class="base-container flex flex-col justify-between gap-2 p-4">
            <div class="text-base-content/40 text-xs tracking-wider uppercase">
              {{ $t('vpsTaxiIncoming') }} / {{ $t('vpsTaxiOutgoing') }}
            </div>
            <div class="flex flex-col gap-1">
              <div class="flex items-baseline justify-between gap-2">
                <span class="text-base-content/50 text-[11px]">↓</span>
                <span class="text-lg font-extralight tabular-nums">{{ incomingLabel }}</span>
              </div>
              <div class="flex items-baseline justify-between gap-2">
                <span class="text-base-content/50 text-[11px]">↑</span>
                <span class="text-lg font-extralight tabular-nums">{{ outgoingLabel }}</span>
              </div>
            </div>
          </section>

          <section class="base-container flex flex-col justify-between gap-2 p-4">
            <div class="text-base-content/40 text-xs tracking-wider uppercase">
              {{ $t('vpsTaxiPeriod') }}
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-sm tabular-nums">{{ periodRangeLabel }}</span>
              <span class="text-base-content/40 text-[11px]">{{ periodLeftLabel }}</span>
            </div>
            <div class="text-base-content/30 truncate text-[11px]">
              {{ $t('vpsTaxiUpdatedAt', { time: upstreamUpdatedLabel }) }}
            </div>
          </section>

          <article
            v-for="instance in instances"
            :key="instance.id"
            class="base-container flex flex-col gap-3 p-4 sm:col-span-2"
          >
            <header class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 flex-wrap items-center gap-2">
                <h3 class="truncate text-sm font-semibold">{{ instance.label }}</h3>
                <span
                  class="badge badge-xs shrink-0"
                  :class="instance.status === 'active' ? 'badge-success' : 'badge-ghost'"
                >
                  {{ statusLabel(instance) }}
                </span>
                <span class="badge badge-ghost badge-xs shrink-0 font-mono"
                  >#{{ instance.id }}</span
                >
              </div>
              <div class="shrink-0 text-right">
                <div class="text-base-content/40 text-[10px] tracking-wider uppercase">
                  {{ $t('vpsTaxiRenewsAt') }}
                </div>
                <div class="text-xs tabular-nums">{{ renewLabel(instance) }}</div>
              </div>
            </header>

            <div class="flex flex-wrap items-center gap-1.5">
              <span class="badge badge-ghost badge-sm font-mono">{{ instance.plan }}</span>
              <span class="badge badge-ghost badge-sm">{{ instance.region }}</span>
              <span
                v-if="instance.billing"
                class="badge badge-ghost badge-sm font-mono tabular-nums"
              >
                {{ billingLabel(instance) }}
              </span>
            </div>

            <div class="flex flex-col gap-1.5">
              <div class="flex items-baseline justify-between gap-2 text-xs">
                <span class="text-base-content/50">{{ $t('vpsTaxiTrafficUsed') }}</span>
                <span class="tabular-nums">
                  <span class="text-sm font-medium">{{ usedLabel(instance.id) }}</span>
                  <span class="text-base-content/40"> / {{ quotaLabel(instance.id) }}</span>
                </span>
              </div>
              <progress
                v-if="percentageOf(instance.id) !== null"
                class="progress h-1.5 w-full"
                :class="progressClassFor(percentageOf(instance.id) ?? 0)"
                :value="percentageOf(instance.id) ?? 0"
                max="100"
              ></progress>
              <div
                class="text-base-content/40 flex items-center justify-between text-[11px] tabular-nums"
              >
                <span>
                  ↓ {{ prettyBytesHelper(bandwidthOf(instance.id)?.incoming_bytes ?? 0) }} · ↑
                  {{ prettyBytesHelper(bandwidthOf(instance.id)?.outgoing_bytes ?? 0) }}
                </span>
                <span v-if="percentageOf(instance.id) !== null"
                  >{{ percentageOf(instance.id) }}%</span
                >
              </div>
            </div>

            <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
              <template
                v-for="field in networkFields(instance)"
                :key="field.label"
              >
                <dt class="text-base-content/40">{{ field.label }}</dt>
                <dd class="flex min-w-0 items-center gap-1">
                  <span class="truncate font-mono">{{ field.value }}</span>
                  <button
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
            v-if="instances.length"
            class="base-container flex flex-col gap-2 p-4 sm:col-span-2"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="text-base-content/40 text-xs tracking-wider uppercase">
                {{ $t('vpsTaxiDaily') }}
              </div>
              <select
                v-if="instances.length > 1"
                v-model.number="selectedId"
                class="select select-xs max-w-40"
              >
                <option
                  v-for="instance in instances"
                  :key="instance.id"
                  :value="instance.id"
                >
                  {{ instance.label }}
                </option>
              </select>
            </div>
            <VpsTaxiDailyChart
              v-if="dailyChartVisible"
              :days="activeBandwidth?.days ?? []"
              class="h-56"
            />
            <div
              v-else
              class="text-base-content/40 flex h-56 items-center justify-center text-xs"
            >
              {{ $t('vpsTaxiNoDaily') }}
            </div>
          </section>
        </div>
      </template>

      <div
        v-else
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
import CtrlsBar from '@/components/common/CtrlsBar.vue'
import { usePaddingForViews } from '@/composables/use-padding-for-views'
import { showNotification } from '@/helper/notification'
import { prettyBytesHelper } from '@/helper/utils'
import VpsTaxiDailyChart from '@/modules/vps-taxi/VpsTaxiDailyChart.vue'
import type { VpsTaxiInstance } from '@/modules/vps-taxi/api'
import {
  refreshVpsTaxi,
  resetVpsTaxi,
  vpsTaxiBandwidthOf,
  vpsTaxiError,
  vpsTaxiFetchedAt,
  vpsTaxiInstances as instances,
  vpsTaxiLoading,
  vpsTaxiPercentage as totalPercentage,
  vpsTaxiPeriod,
  vpsTaxiRefreshing,
  vpsTaxiSnapshot,
  vpsTaxiTotals,
} from '@/modules/vps-taxi/state'
import { vpsTaxiApiBase, vpsTaxiApiKey } from '@/modules/vps-taxi/store'
import {
  ArrowPathIcon,
  ClipboardDocumentIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/vue/24/outline'
import dayjs from 'dayjs'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { padding } = usePaddingForViews()

const configOpen = ref(false)
const showKey = ref(false)
const baseDraft = ref(vpsTaxiApiBase.value)
const keyDraft = ref(vpsTaxiApiKey.value)
const basePlaceholder = '/vps-taxi/api/v1'

const selectedId = ref<number | null>(null)

const bandwidthOf = (instanceId: number) => vpsTaxiBandwidthOf(instanceId)

const updatedLabel = computed(() => {
  if (!vpsTaxiFetchedAt.value) return ''

  return t('vpsTaxiUpdatedAt', { time: dayjs(vpsTaxiFetchedAt.value).format('HH:mm:ss') })
})

const limited = computed(() => vpsTaxiTotals.value.quota > 0)
const totalUsedLabel = computed(() => prettyBytesHelper(vpsTaxiTotals.value.total))
const incomingLabel = computed(() => prettyBytesHelper(vpsTaxiTotals.value.incoming))
const outgoingLabel = computed(() => prettyBytesHelper(vpsTaxiTotals.value.outgoing))
const totalQuotaLabel = computed(() =>
  limited.value ? prettyBytesHelper(vpsTaxiTotals.value.quota) : t('vpsTaxiUnlimited'),
)
const totalRemainingLabel = computed(() => {
  if (!limited.value) return t('vpsTaxiUnlimited')

  return prettyBytesHelper(Math.max(0, vpsTaxiTotals.value.quota - vpsTaxiTotals.value.total))
})

// The API reports periods in its own timezone; formatting them in the browser
// timezone would shift the period by a day.
const formatInZone = (iso: string, timeZone: string, withTime = false) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'UTC',
    month: '2-digit',
    day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  }).formatToParts(new Date(iso))

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return withTime
    ? `${value('month')}-${value('day')} ${value('hour')}:${value('minute')}`
    : `${value('month')}-${value('day')}`
}

const periodRangeLabel = computed(() => {
  const period = vpsTaxiPeriod.value

  if (!period) return '-'

  const start = formatInZone(period.period_start, period.timezone)
  const end = formatInZone(period.period_end, period.timezone)

  return `${start} → ${end}`
})

const periodLeftLabel = computed(() => {
  const period = vpsTaxiPeriod.value

  if (!period) return ''

  const days = Math.max(0, Math.floor((Date.parse(period.period_end) - Date.now()) / 86_400_000))

  return t('vpsTaxiDaysLeft', { days })
})

const upstreamUpdatedLabel = computed(() => {
  const period = vpsTaxiPeriod.value

  return period ? formatInZone(period.updated_at, period.timezone, true) : '-'
})

const progressClassFor = (percentage: number) => {
  if (percentage >= 90) return 'progress-error'
  if (percentage >= 70) return 'progress-warning'

  return 'progress-success'
}

const errorLabel = computed(() => {
  switch (vpsTaxiError.value) {
    case 'unauthorized':
      return t('vpsTaxiUnauthorized')
    case 'rateLimited':
      return t('vpsTaxiRateLimited')
    case 'unavailable':
      return t('vpsTaxiUnavailable')
    case 'network':
      return t('vpsTaxiNetwork')
    case 'unknown':
      return t('vpsTaxiUnknown')
    default:
      return ''
  }
})

const saveConfig = () => {
  vpsTaxiApiBase.value = baseDraft.value.trim()
  vpsTaxiApiKey.value = keyDraft.value.trim()

  resetVpsTaxi()
  configOpen.value = false
  void refreshVpsTaxi(true)
}

const statusLabel = (instance: VpsTaxiInstance) =>
  instance.status === 'active' ? t('vpsTaxiStatusActive') : instance.status

const renewLabel = (instance: VpsTaxiInstance) =>
  instance.renews_at ? dayjs(instance.renews_at).format('YYYY-MM-DD') : t('vpsTaxiNoRenew')

const billingLabel = (instance: VpsTaxiInstance) => {
  const billing = instance.billing

  if (!billing) return ''

  return `${billing.currency} ${billing.price} / ${billing.term} ${billing.period}`
}

const usedLabel = (instanceId: number) =>
  prettyBytesHelper(vpsTaxiBandwidthOf(instanceId)?.total_bytes ?? 0)

const quotaLabel = (instanceId: number) => {
  const bandwidth = vpsTaxiBandwidthOf(instanceId)

  if (!bandwidth) return '-'

  const quota = bandwidth.quota_bytes + bandwidth.quota_purchased_bytes

  return quota > 0 ? prettyBytesHelper(quota) : t('vpsTaxiUnlimited')
}

const percentageOf = (instanceId: number): number | null => {
  const bandwidth = vpsTaxiBandwidthOf(instanceId)

  if (!bandwidth) return null

  const quota = bandwidth.quota_bytes + bandwidth.quota_purchased_bytes

  if (quota <= 0) return null

  return Number(((bandwidth.total_bytes / quota) * 100).toFixed(2))
}

const networkFields = (instance: VpsTaxiInstance) =>
  [
    { label: t('vpsTaxiIpv4'), value: instance.ipv4 },
    { label: t('vpsTaxiIpv6'), value: instance.ipv6_prefix ?? undefined },
  ].filter((field): field is { label: string; value: string } => Boolean(field.value))

const activeBandwidth = computed(() =>
  selectedId.value === null ? null : vpsTaxiBandwidthOf(selectedId.value),
)

const dailyChartVisible = computed(() => (activeBandwidth.value?.days.length ?? 0) > 0)

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

watch(
  instances,
  (list) => {
    if (!list.length) {
      selectedId.value = null

      return
    }

    if (selectedId.value === null || !list.some((item) => item.id === selectedId.value)) {
      selectedId.value = list[0].id
    }
  },
  { immediate: true },
)

// A missing proxy route or a rejected key both surface as an error, and the
// endpoint form is the only way to fix either, so open it once.
watch(vpsTaxiError, (error) => {
  if (error) configOpen.value = true
})

onMounted(() => {
  void refreshVpsTaxi()
})
</script>
