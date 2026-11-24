<template>
  <div class="base-container p-4">
    <Teleport
      to="body"
      :disabled="!isFullScreen"
    >
      <div
        :class="
          isFullScreen
            ? [
                'bg-base-100 fixed inset-0 z-[9999] flex h-screen w-screen flex-col bg-cover bg-center p-4',
                backgroundImage && 'custom-background',
              ]
            : undefined
        "
        :style="isFullScreen ? backgroundImage : undefined"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-2">
            <div
              class="text-base-content/60 truncate text-xs font-semibold tracking-wider uppercase"
            >
              {{ $t('connectionTopology') }}
            </div>
            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="opacity-0 -translate-x-1"
              leave-active-class="transition duration-100 ease-in"
              leave-to-class="opacity-0"
            >
              <span
                v-if="isManuallyPaused"
                class="bg-warning/15 text-warning flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] leading-none font-medium"
              >
                <span class="bg-warning h-1 w-1 rounded-full" />
                {{ t('topologyPaused') }}
              </span>
            </Transition>
          </div>
          <div
            class="bg-base-200/60 border-base-border flex shrink-0 items-center gap-0.5 rounded-full border p-0.5"
          >
            <button
              type="button"
              class="focus-visible:ring-primary/40 flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2"
              :class="
                topologyApplyConnectionFilter
                  ? 'bg-primary text-primary-content shadow-xs'
                  : 'text-base-content/55 hover:bg-base-content/10 hover:text-base-content'
              "
              :aria-label="t('applyConnectionFilter')"
              :aria-pressed="topologyApplyConnectionFilter"
              :title="t('applyConnectionFilter')"
              @click="topologyApplyConnectionFilter = !topologyApplyConnectionFilter"
            >
              <FunnelIcon class="h-4 w-4 shrink-0" />
              <span class="hidden sm:inline">{{ t('applyConnectionFilter') }}</span>
            </button>
            <span
              class="bg-base-content/10 h-3.5 w-px shrink-0"
              aria-hidden="true"
            />
            <button
              type="button"
              class="focus-visible:ring-primary/40 grid h-8 w-8 cursor-pointer place-items-center rounded-full transition-colors outline-none focus-visible:ring-2"
              :class="
                isManuallyPaused
                  ? 'bg-warning/15 text-warning'
                  : 'text-base-content/55 hover:bg-base-content/10 hover:text-base-content'
              "
              :aria-label="t(isManuallyPaused ? 'topologyResume' : 'topologyPause')"
              :title="t(isManuallyPaused ? 'topologyResume' : 'topologyPause')"
              :aria-pressed="isManuallyPaused"
              @click="isManuallyPaused = !isManuallyPaused"
            >
              <PlayIcon
                v-if="isManuallyPaused"
                class="h-4 w-4"
              />
              <PauseIcon
                v-else
                class="h-4 w-4"
              />
            </button>
            <button
              type="button"
              class="text-base-content/55 hover:bg-base-content/10 hover:text-base-content focus-visible:ring-primary/40 grid h-8 w-8 cursor-pointer place-items-center rounded-full transition-colors outline-none focus-visible:ring-2"
              :aria-label="t(isFullScreen ? 'topologyCollapse' : 'topologyExpand')"
              :title="t(isFullScreen ? 'topologyCollapse' : 'topologyExpand')"
              :aria-pressed="isFullScreen"
              @click="isFullScreen = !isFullScreen"
            >
              <ArrowsPointingInIcon
                v-if="isFullScreen"
                class="h-4 w-4"
              />
              <ArrowsPointingOutIcon
                v-else
                class="h-4 w-4"
              />
            </button>
          </div>
        </div>
        <div
          class="bg-base-200/30 relative w-full overflow-hidden rounded-xl"
          :class="isFullScreen ? 'mt-2 min-h-0 flex-1' : 'mt-4 h-96'"
          data-page-swipe-ignore
          @mousemove.stop
        >
          <div
            class="relative"
            :class="isFullScreen ? 'bg-base-100' : 'h-full w-full'"
            :style="chartSurfaceStyle"
          >
            <div
              ref="chartRef"
              class="h-full w-full"
            />
            <div
              v-if="isEmpty"
              class="text-base-content/50 absolute inset-0 flex items-center justify-center"
            >
              {{ t('noData') }}
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { activeConnections } from '@/assembly/connections'
import { escapeChartHtml } from '@/components/charts/chart-tooltip'
import { useChartTheme, useEChart, type EChartOption } from '@/composables/use-echart'
import { getConnectionChains, getConnectionRule, getConnectionSourceIP } from '@/helper'
import { backgroundImage } from '@/helper/indexeddb'
import { getIPLabelFromMap } from '@/helper/source-ip'
import { isMiddleScreen } from '@/helper/utils'
import { filteredActiveConnections } from '@/store/connections'
import { topologyApplyConnectionFilter } from '@/store/settings'
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  FunnelIcon,
  PauseIcon,
  PlayIcon,
} from '@heroicons/vue/24/outline'
import { useWindowSize } from '@vueuse/core'
import type { CSSProperties } from 'vue'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { buildTopologyData } from './topology'

const { t } = useI18n()
const chartRef = ref<HTMLElement>()
const isFullScreen = ref(false)
const isManuallyPaused = ref(false)
const isTooltipVisible = ref(false)
const { width: windowWidth, height: windowHeight } = useWindowSize()
const { colors, fontFamily } = useChartTheme(chartRef)

const isPaused = computed(() => isManuallyPaused.value || isTooltipVisible.value)
const shouldRotate = computed(
  () => isFullScreen.value && isMiddleScreen.value && windowHeight.value > windowWidth.value,
)

const chartSurfaceStyle = computed<CSSProperties>(() => {
  if (!isFullScreen.value) return {}

  const style: CSSProperties = {
    backdropFilter: 'var(--app-glass, none)',
    WebkitBackdropFilter: 'var(--app-glass, none)',
    height: '100%',
    width: '100%',
  }

  if (!shouldRotate.value) return style

  return {
    ...style,
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '100vh',
    height: '100vw',
    marginTop: '-50vw',
    marginLeft: '-50vh',
    transform: 'rotate(90deg)',
  }
})

const topologyData = computed(() =>
  buildTopologyData(
    (topologyApplyConnectionFilter.value
      ? filteredActiveConnections.value
      : activeConnections.value
    ).map((connection) => ({
      source: getIPLabelFromMap(getConnectionSourceIP(connection)),
      rule: getConnectionRule(connection),
      chains: getConnectionChains(connection),
    })),
    {
      sourceIPAddress: t('sourceIPAddress'),
      ruleMatch: t('ruleMatch'),
      proxyChainEntry: t('proxyChainEntry'),
      proxyChainExit: t('proxyChainExit'),
      unknown: t('unknown'),
    },
  ),
)
const isEmpty = computed(() => topologyData.value.nodes.length === 0)

const options = computed<EChartOption>(() => ({
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: fontFamily.value || 'inherit',
    color: colors.text,
  },
  tooltip: {
    trigger: 'item',
    triggerOn: 'mousemove',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    textStyle: {
      color: colors.text,
    },
    formatter: (params: unknown) => {
      const { dataType, data } = params as {
        dataType: 'node' | 'edge'
        data: {
          name: string
          nodeType?: string
          source: number
          target: number
          value: number
          originalValue?: number
        }
      }

      if (dataType === 'node') {
        return `${escapeChartHtml(data.name)}<br/>${escapeChartHtml(t('nodeType'))}: ${escapeChartHtml(
          data.nodeType || t('unknown'),
        )}`
      }

      if (dataType === 'edge') {
        const sourceNode = topologyData.value.nodes.find((node) => node.id === data.source)
        const targetNode = topologyData.value.nodes.find((node) => node.id === data.target)
        const count = data.originalValue ?? data.value

        if (sourceNode && targetNode) {
          return `${escapeChartHtml(sourceNode.name)} → ${escapeChartHtml(
            targetNode.name,
          )}<br/>${escapeChartHtml(t('connectionCount'))}: ${escapeChartHtml(count)}`
        }

        return `${escapeChartHtml(t('connectionCount'))}: ${escapeChartHtml(count)}`
      }

      return ''
    },
  },
  series: [
    {
      id: 'sankey',
      type: 'sankey',
      layout: 'none',
      data: topologyData.value.nodes,
      links: topologyData.value.links,
      emphasis: {
        focus: 'trajectory',
      },
      lineStyle: {
        color: 'gradient',
        curveness: 0.5,
      },
      itemStyle: {
        borderWidth: 0,
      },
      label: {
        color: colors.text,
        fontSize: isMiddleScreen.value ? 10 : 12,
        formatter: (params: { name: string }) => {
          const maxLength = isFullScreen.value ? 45 : isMiddleScreen.value ? 20 : 30
          return params.name.length > maxLength
            ? `${params.name.substring(0, maxLength)}...`
            : params.name
        },
      },
      nodeGap: 4,
      nodeWidth: 15,
      nodeAlign: 'left',
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
      animationDelay: (index: number) => index * 50,
    },
  ],
}))

const { resize } = useEChart(chartRef, options, {
  paused: isPaused,
  isEmpty,
  onInit: (chart) => {
    const showTooltip = () => {
      isTooltipVisible.value = true
    }
    const hideTooltip = () => {
      isTooltipVisible.value = false
    }

    chart.on('showTip', showTooltip)
    chart.on('hideTip', hideTooltip)

    return () => {
      chart.off('showTip', showTooltip)
      chart.off('hideTip', hideTooltip)
    }
  },
})

watch([isFullScreen, shouldRotate, windowWidth, windowHeight], () => {
  nextTick(resize)
})
</script>
