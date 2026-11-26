<template>
  <div
    ref="chartRef"
    class="w-full"
  />
</template>

<script setup lang="ts">
import { useChartTheme, useEChart, type EChartOption } from '@/composables/use-echart'
import { prettyBytesHelper } from '@/helper/utils'
import type { VpsTaxiBandwidthDay } from '@/modules/vps-taxi/api'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ days: VpsTaxiBandwidthDay[] }>()

const { t } = useI18n()
const chartRef = ref<HTMLElement>()
const { colors, fontFamily } = useChartTheme(chartRef)

const options = computed<EChartOption>(() => ({
  grid: { left: 46, top: 8, right: 8, bottom: 20 },
  tooltip: {
    trigger: 'axis',
    backgroundColor: colors.surface,
    borderColor: colors.surface,
    borderRadius: 8,
    confine: true,
    padding: [4, 8],
    textStyle: { color: colors.text, fontFamily: fontFamily.value, fontSize: 11 },
    formatter: (params: { axisValue?: string; seriesName?: string; value?: number }[]) => {
      const head = params[0]?.axisValue ?? ''

      return [
        head,
        ...params.map((p) => `${p.seriesName}: ${prettyBytesHelper(p.value ?? 0)}`),
      ].join('<br/>')
    },
  },
  xAxis: {
    type: 'category',
    data: props.days.map((day) => day.date.slice(5)),
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: colors.textMuted, fontFamily: fontFamily.value, fontSize: 9 },
  },
  yAxis: {
    type: 'value',
    splitNumber: 3,
    axisTick: { show: false },
    axisLine: { show: false },
    splitLine: { show: true, lineStyle: { type: 'dashed', color: colors.grid } },
    axisLabel: {
      color: colors.textMuted,
      fontFamily: fontFamily.value,
      fontSize: 9,
      formatter: (value: number) => prettyBytesHelper(value, { maximumFractionDigits: 0 }),
    },
  },
  series: [
    {
      name: t('vpsTaxiIncoming'),
      type: 'bar',
      stack: 'traffic',
      barMaxWidth: 14,
      data: props.days.map((day) => day.incoming_bytes),
      itemStyle: { color: colors.seriesSecondary },
    },
    {
      name: t('vpsTaxiOutgoing'),
      type: 'bar',
      stack: 'traffic',
      barMaxWidth: 14,
      data: props.days.map((day) => day.outgoing_bytes),
      itemStyle: { color: colors.seriesPrimary, borderRadius: [2, 2, 0, 0] },
    },
  ],
}))

useEChart(chartRef, options)
</script>
