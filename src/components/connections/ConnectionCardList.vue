<template>
  <VirtualScroller
    :data="renderConnections"
    :size="size"
  >
    <template v-slot:before>
      <ConnectionCtrl />
    </template>
    <template v-slot="{ item }: { item: Connection }">
      <ConnectionCard :conn="item" />
    </template>
  </VirtualScroller>
</template>

<script setup lang="ts">
import { renderConnections } from '@/store/connections'
import { connectionCardLines } from '@/store/settings'
import type { Connection } from '@/types'
import { computed } from 'vue'
import VirtualScroller from '../common/VirtualScroller.vue'
import ConnectionCtrl from '../controls/ConnectionCtrl.tsx'
import ConnectionCard from './ConnectionCard'
const size = computed(() => {
  // +8 是行与行之间的间距，算进估算值可以少一轮测量回跳
  return connectionCardLines.value.length * 28 + 12
})
</script>
