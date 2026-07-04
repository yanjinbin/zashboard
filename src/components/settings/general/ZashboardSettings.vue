<template>
  <div class="relative flex flex-col text-sm">
    <div
      class="border-base-300/40 bg-base-100 rounded-box mx-1 mb-3 flex items-center gap-3 border p-3"
    >
      <img
        src="https://cdn.jsdelivr.net/gh/yanjinbin/dotfiles@latest/mihomo/rules/icons/router.svg"
        class="h-10 w-10 shrink-0"
        alt=""
      />
      <div class="flex min-w-0 flex-col">
        <span class="text-base font-semibold"> ImmortalWrt-R5C-Gateway Nikki 控制面板 </span>
        <a
          href="https://router-docs-sepia.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          class="link link-primary truncate text-xs"
        >
          https://router-docs-sepia.vercel.app/
        </a>
      </div>
    </div>
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
          href="https://github.com/yanjinbin/zashboard"
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

    <div
      v-if="isVisibleActions"
      class="settings-grid my-3 gap-2 p-3 md:grid-cols-2!"
    >
      <button
        :class="twMerge('btn btn-neutral btn-sm', isUIUpgrading ? 'animate-pulse' : '')"
        @click="handlerClickUpgradeUI"
      >
        {{ $t('upgradeDashboard') }}
      </button>
      <DashboardSettings />
    </div>

    <StyleSettings />
    <GeneralSettings />
  </div>
</template>

<script setup lang="ts">
import { isUIUpdateAvailable, upgradeUIAPI, zashboardVersion } from '@/assembly/version'
import DashboardSettings from '@/components/common/DashboardSettings.vue'
import { useIsSettingVisible } from '@/composables/settings'
import { GENERAL_ITEM_KEYS } from '@/config/settingsItems'
import { handlerUpgradeSuccess } from '@/helper'
import { twMerge } from 'tailwind-merge'
import { ref } from 'vue'
import GeneralSettings from './GeneralSettings.vue'
import StyleSettings from './StyleSettings.vue'

const k = GENERAL_ITEM_KEYS
const isVisibleActions = useIsSettingVisible(k.actions)

const commitId = __COMMIT_ID__

const isUIUpgrading = ref(false)

const handlerClickUpgradeUI = async () => {
  if (isUIUpgrading.value) return
  isUIUpgrading.value = true
  try {
    await upgradeUIAPI()
    isUIUpgrading.value = false
    handlerUpgradeSuccess()
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  } catch {
    isUIUpgrading.value = false
  }
}
</script>
