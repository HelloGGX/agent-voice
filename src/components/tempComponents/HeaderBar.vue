<script setup lang="ts">
import { defineProps } from "vue";

const props = defineProps<{
  connectState: "idle" | "connecting" | "open" | "closed" | "unknown";
}>();

const connectStateText = computed(() => {
  switch (props.connectState) {
    case "idle":
      return "初始化";
    case "connecting":
      return "连接中...";
    case "open":
      return "在线";
    case "closed":
      return "离线";
    default:
      return "未知状态";
  }
});

const statusDotClass = computed(() => {
  switch (props.connectState) {
    case "idle":
      return "bg-gray-400";
    case "connecting":
      return "bg-yellow-500 animate-pulse";
    case "open":
      return "bg-green-500";
    case "closed":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
});
</script>
<template>
  <header class="p-4 border-b dark:border-gray-700">
    <div class="flex items-center justify-between mx-auto">
      <h1 class="text-xl font-semibold dark:text-gray-100">AI语音助手</h1>
      <div class="flex items-center gap-2">
        <div class="h-3 w-3 rounded-full" :class="statusDotClass" />
        <span class="text-sm text-muted-foreground">{{ connectStateText }}</span>
      </div>
    </div>
  </header>
</template>
