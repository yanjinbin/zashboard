<template>
  <a
    v-if="showPanelTitleBanner"
    href="https://router-docs-sepia.vercel.app/"
    target="_blank"
    rel="noopener noreferrer"
    class="link link-hover text-base-content hover:text-primary hidden min-w-0 items-center justify-center gap-1.5 text-sm font-semibold whitespace-nowrap lg:flex"
  >
    <img
      src="https://cdn.jsdelivr.net/gh/yanjinbin/dotfiles@latest/mihomo/rules/icons/router.svg"
      class="h-5 w-5 shrink-0"
      alt=""
    />
    <span class="truncate">ImmortalWrt-R5C-Gateway Nikki 控制面板</span>
  </a>
</template>
<script lang="ts" setup>
import { showPanelTitleBanner } from '@/store/settings'
</script>
