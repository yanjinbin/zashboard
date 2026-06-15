<template>
  <div
    class="bg-base-100 md:bg-base-100/50 need-blur fixed top-0 right-0 left-0 z-30 shadow-xs backdrop-blur-xl"
    :class="[isMiddleScreen ? 'fixed' : 'sticky']"
    ref="ctrlsBarRef"
  >
    <slot></slot>
    <a
      v-if="showPanelTitleBanner"
      href="https://router-docs-sepia.vercel.app/"
      target="_blank"
      rel="noopener noreferrer"
      class="link link-hover text-base-content hover:text-primary pointer-events-auto absolute top-1/2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 text-sm font-semibold whitespace-nowrap lg:flex"
    >
      <img
        src="https://cdn.jsdelivr.net/gh/yanjinbin/dotfiles@latest/mihomo/rules/icons/router.svg"
        class="h-5 w-5"
        alt=""
      />
      ImmortalWrt-R5C-Gateway Nikki 控制面板
    </a>
  </div>
</template>
<script lang="ts" setup>
import { ctrlsBottom } from '@/composables/paddingViews'
import { isMiddleScreen } from '@/helper/utils'
import { showPanelTitleBanner } from '@/store/settings'
import { useElementBounding } from '@vueuse/core'
import { onUnmounted, ref, watch } from 'vue'

const ctrlsBarRef = ref<HTMLDivElement | null>(null)
const { bottom: ctrlsBarBottom } = useElementBounding(ctrlsBarRef)

watch(
  ctrlsBarBottom,
  () => {
    ctrlsBottom.value = ctrlsBarBottom.value
  },
  { immediate: true },
)

onUnmounted(() => {
  ctrlsBottom.value = 0
})
</script>
