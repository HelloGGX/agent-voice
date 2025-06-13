<template>
  <div
    class="fixed bottom-0 left-0 w-full flex justify-center z-50 pointer-events-none"
    aria-label="语音控制栏"
    role="region"
  >
    <div
      class="pointer-events-auto bg-white/90 dark:bg-neutral-900/90 shadow-xl rounded-t-2xl px-6 py-4 flex items-center gap-4 max-w-md w-full mb-2 border border-neutral-200 dark:border-neutral-800"
    >
      <!-- 麦克风按钮 -->
      <Button
        :variant="isListening ? 'default' : 'outline'"
        class="rounded-full p-3 transition-colors duration-200"
        aria-pressed="isListening"
        aria-label="切换语音监听"
        @click="toggleListening"
      >
        <Mic :size="28" :class="isListening ? 'text-primary' : 'text-neutral-500'" />
      </Button>

      <!-- 唤醒词动画波形 -->
      <div class="flex-1 flex items-center justify-center min-h-[32px]" aria-live="polite">
        <div v-if="wakeWordDetected" class="flex gap-1 items-end h-8">
          <div
            v-for="(h, i) in waveformData"
            :key="i"
            :style="{ height: h + 'px' }"
            class="w-1.5 rounded bg-primary transition-all duration-200"
          />
        </div>
        <div v-else class="text-xs text-neutral-400 select-none">请说出唤醒词…</div>
      </div>

      <!-- 错误提示按钮 -->
      <Button
        v-if="error"
        variant="destructive"
        size="icon"
        @click="showErrorToast"
        aria-label="语音错误"
      >
        <AlertCircle :size="24" />
      </Button>
    </div>
    <Toaster class="pointer-events-auto" />
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { useSpeechService } from '@/features/speechRecognition';
import { Mic, AlertCircle } from 'lucide-vue-next';

// 使用语音服务
const { startListening } = useSpeechService();

// 语音控制栏本地状态
const isListening = ref(false);
const wakeWordDetected = ref(false);
const error = ref<string | null>(null);

/**
 * 波形动画数据（模拟）
 * 如需接入真实数据，请通过 props 传递数组并移除本地 mock。
 */
const waveformData = ref<number[]>([12, 24, 18, 30, 22, 16, 28, 20]);
const waveTimer = ref<ReturnType<typeof setInterval> | null>(null);

/**
 * 唤醒词检测和模拟音量动画
 */
const DetectedWakeWord = () => {
  wakeWordDetected.value = true;
  // 模拟音量动画，支持 prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  waveTimer.value = setInterval(() => {
    waveformData.value = [
      Math.random() * 30,
      Math.random() * 30,
      Math.random() * 30,
      Math.random() * 30,
      Math.random() * 30,
      Math.random() * 30,
      Math.random() * 30,
      Math.random() * 30,
    ];
  }, 100);
};
DetectedWakeWord();
const toggleListening = () => {
  isListening.value = !isListening.value;
  // 切换监听时重置状态
  if (!isListening.value) {
    wakeWordDetected.value = false;
    error.value = null;
  } else {
    // 模拟监听后2秒检测到唤醒词
    setTimeout(() => {
      wakeWordDetected.value = true;
      startListening();
      // 动画2秒后自动重置
      setTimeout(() => {
        wakeWordDetected.value = false;
      }, 2000);
    }, 2000);
  }
};

const showErrorToast = () => {
  if (error.value) {
    Toaster.toast(error.value, {
      description: '请检查麦克风或语音识别服务',
      action: {
        label: '重试',
        onClick: () => {
          error.value = null;
        },
      },
    });
  }
};

onUnmounted(() => {
  if (waveTimer.value) {
    clearInterval(waveTimer.value);
  }
});

// 模拟错误（可删除）
// setTimeout(() => { error.value = '语音识别失败' }, 8000)

if (import.meta.env.DEV && error.value) {
  // 控制台输出错误，便于开发调试
  // eslint-disable-next-line no-console
  console.error('VoiceControlBar error:', error.value);
}
</script>

<style scoped>
@media (max-width: 640px) {
  .max-w-md {
    max-width: 100vw;
    border-radius: 0;
    margin-bottom: 0;
  }
}
</style>
