<template>
  <div class="relative w-16 h-16">
    <!-- 静态中心圆点 -->
    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full z-10"></div>

    <!-- 波浪扩散动画 -->
    <div
      class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-primary rounded-full opacity-50 animate-pulse"
      style="animation: wavePulse 1.5s infinite ease-in-out;"
    ></div>
  </div>
</template>

<style scoped>
@keyframes wavePulse {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0.8;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.4);
    opacity: 0;
  }
}
</style>