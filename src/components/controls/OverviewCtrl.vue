<template>
  <CtrlsBar>
    <div class="flex h-12 flex-row items-center gap-2 p-2 text-sm">
      <span class="truncate overflow-hidden">
        {{ getLabelFromBackend(activeBackend!) }}
      </span>
      <span class="mx-1">|</span>
      <BackendVersion />
      <template v-if="startedAt">
        <span class="mx-1">|</span>
        <BackendUptime />
      </template>
    </div>
  </CtrlsBar>
</template>

<script setup lang="ts">
import { startedAt } from '@/assembly/version'
import BackendUptime from '@/components/common/BackendUptime.vue'
import BackendVersion from '@/components/common/BackendVersion.vue'
import { useCtrlsBar } from '@/composables/useCtrlsBar'
import { getLabelFromBackend } from '@/helper/utils'
import { activeBackend } from '@/store/setup'
import CtrlsBar from '../common/CtrlsBar.vue'

useCtrlsBar()
</script>
