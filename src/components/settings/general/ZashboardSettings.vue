<template>
  <div class="relative flex flex-col text-sm">
    <a
      href="https://router-docs-sepia.vercel.app/"
      target="_blank"
      rel="noopener noreferrer"
      class="border-base-300/40 bg-base-100 hover:border-primary/50 rounded-box mx-1 mb-3 flex items-center gap-3 border p-3 transition-colors"
    >
      <img
        src="https://cdn.jsdelivr.net/gh/yanjinbin/dotfiles@latest/mihomo/rules/icons/router.svg"
        class="h-10 w-10 shrink-0"
        alt=""
      />
      <div class="flex min-w-0 flex-col">
        <span class="text-base font-semibold"> ImmortalWrt-R5C/E20C-Gateway Nikki 控制面板 </span>
      </div>
    </a>
    <div class="flex items-center gap-2 px-1">
      <div class="indicator">
        <span
          v-if="isUIUpdateAvailable"
          class="indicator-item top-1 -right-1 flex"
        >
          <span class="bg-secondary absolute h-2 w-2 animate-ping rounded-full"></span>
          <span class="bg-secondary h-2 w-2 rounded-full"></span>
        </span>
        <a
          :href="getZashboardRepoUrl()"
          target="_blank"
          class="text-lg font-semibold"
        >
          zashboard
          <span class="text-sm font-normal opacity-50">
            {{ zashboardVersion }}
            <span
              v-if="commitId"
              class="text-xs"
            >
              {{ commitId }}
            </span>
          </span>
        </a>
      </div>
    </div>

    <StyleSettings />
    <GeneralSettings />
  </div>
</template>

<script setup lang="ts">
import { getZashboardRepoUrl } from '@/assembly/dashboard-release'
import { isUIUpdateAvailable, zashboardVersion } from '@/assembly/version'
import GeneralSettings from './GeneralSettings.vue'
import StyleSettings from './StyleSettings.vue'

const commitId = __COMMIT_ID__
</script>
