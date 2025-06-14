<script setup lang="ts">
// import { Button } from '@/components/ui/button';
// import { Mic, Activity } from 'lucide-vue-next';
import ConversationPanel from '@/components/tempComponents/ConversationPanel.vue';
import HeaderBar from '@/components/tempComponents/HeaderBar.vue';
// import VoiceWaveAnimation from '@/components/tempComponents/VoiceWaveAnimation.vue';
import VoiceControlBar from '@/components/tempComponents/VoiceControlBar.vue';
import { Toaster } from '@/components/ui/sonner';
import { useMachine } from '@xstate/vue';
// import { useSpeechService } from '@/features/speechRecognition';
import { createBrowserInspector } from '@statelyai/inspect';
import { SSEState, SSEStateMachine } from './features/SSEConnection';
import 'vue-sonner/style.css';
import { getAIChatApi } from './apis/AIChatApi';

const { inspect } = createBrowserInspector({ autoStart: false });
const { snapshot: SSESnapshot, send } = useMachine(SSEStateMachine, { inspect });

// watch(
//   () => SSESnapshot.value,
//   (snapshot) => {
//     console.log('watchSSESnapshot', snapshot.value);
//   },
//   {
//     immediate: true,
//   },
// );

/**
 * SSE服务状态信息
 */
const connectState = computed<SSEState>(() => {
  const snapshotValue = SSESnapshot.value;
  if (snapshotValue.matches('idle')) return 'idle';
  if (snapshotValue.matches('connecting')) return 'connecting';
  if (snapshotValue.matches('delaying')) return 'delaying';
  if (snapshotValue.matches('open')) return 'open';
  if (snapshotValue.matches('failed')) return 'failed';
  return 'failed';
});

const messages = computed(() => {
  return SSESnapshot.value?.context?.messages || [];
});

onMounted(() => {
  // toast.error("401", {
  //   description: "test toast",
  // });
  send({ type: 'CONNECT' });
  setTimeout(() => {
    getAIChatApi({
      text: '值机的流程是什么，分点分条，最好有表格形式',
    })
  }, 4000);
  // setTimeout(() => {
  //   getAIChatApi({
  //     text: '你能帮我干什么',
  //   })
  // }, 22000);
});
</script>

<template>
  <div class="w-full max-w-full h-screen flex flex-col bg-background dark:bg-gray-900">
    <!-- 头部状态栏 -->
    <HeaderBar :connect-state="connectState" />

    <!-- 对话记录区域 -->
    <ConversationPanel :messages="messages" />

    <!-- 语音控制栏 -->
    <!-- <footer class="p-8 border-t dark:border-gray-700">
      <div class="mx-auto flex justify-center">
        <Button @click="startListening" size="lg" class="rounded-full h-16 w-16 relative">
          <Mic class="h-8 w-8" />
          <span class="absolute -top-2 -right-2">
            <Activity class="h-4 w-4 animate-pulse" />
          </span>
        </Button>
        <VoiceWaveAnimation />
      </div>
    </footer> -->
    <VoiceControlBar />
    <Toaster />
  </div>
</template>
