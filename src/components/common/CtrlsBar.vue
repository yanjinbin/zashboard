<template>
  <div
    class="bg-base-100 md:bg-base-100/50 need-blur fixed top-0 right-0 left-0 z-30 shadow-xs backdrop-blur-xl"
    :class="[isMiddleScreen ? 'fixed' : 'sticky']"
    ref="ctrlsBarRef"
  >
    <slot></slot>
    <div
      class="border-base-300/40 flex flex-wrap items-center justify-center gap-x-2 border-t px-3 py-1 text-center text-xs"
    >
      <span class="text-base-content/80 font-medium"> ImmortalWrt-R5C-Gateway Nikki 控制面板 </span>
      <a
        href="https://router-docs-sepia.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
        class="link link-primary inline-flex items-center gap-1"
      >
        <img
          src="https://cdn.jsdelivr.net/gh/yanjinbin/dotfiles@latest/mihomo/rules/icons/router.svg"
          class="h-3.5 w-3.5"
          alt=""
        />
        路由文档
      </a>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ctrlsBottom } from '@/composables/paddingViews'
import { isMiddleScreen } from '@/helper/utils'
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
