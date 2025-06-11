<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Mic, Activity } from 'lucide-vue-next';
import ConversationPanel from '@/components/tempComponents/ConversationPanel.vue';
import HeaderBar from '@/components/tempComponents/HeaderBar.vue';
import { Toaster } from '@/components/ui/sonner';
import { useMachine } from '@xstate/vue';
import { useSpeechService } from '@/features/speechRecognition';
import { createBrowserInspector } from '@statelyai/inspect';
import 'vue-sonner/style.css';
import { client, SSEState, SSEStateMachine } from './features/SSEConnection';

const { inspect } = createBrowserInspector({ autoStart: false });
const { snapshot: SSESnapshot, send } = useMachine(SSEStateMachine, { inspect });

watch(
  () => SSESnapshot.value,
  (snapshot) => {
    console.log('watchSSESnapshot', snapshot.value, typeof snapshot.value);
  },
  {
    immediate: true,
  },
);
client.on('message', (data) => {
  send({ type: 'message', data });
});
// 使用语音服务
const { startListening } = useSpeechService();
// 使用SSE服务
// const { onMessage, onError, onClose } = useSSE(SSEactorRef);

/**
 * SSE服务状态信息
 */
const connectState = computed<SSEState>(() => {
  const snapshotValue = SSESnapshot.value;
  if (snapshotValue.matches('idle')) return 'idle';
  if (snapshotValue.matches('connecting')) return 'connecting';
  if (snapshotValue.matches('delaying')) return 'delaying';
  if (snapshotValue.matches('open')) return 'open';
  if (snapshotValue.matches('closed')) return 'closed';
  return 'closed';
});

const messages = computed(() => {
  return SSESnapshot.value?.context?.messages || [];
});

onMounted(() => {
  // toast.error("401", {
  //   description: "test toast",
  // });
  // SSEactorRef.start();
  send({ type: 'connect' });
});
</script>

<template>
  <div class="w-full max-w-full h-screen flex flex-col bg-background dark:bg-gray-900">
    <!-- 头部状态栏 -->
    <HeaderBar :connect-state="connectState" />

    <!-- 对话记录区域 -->
    <ConversationPanel :messages="messages" />

    <!-- 语音控制栏 -->
    <footer class="p-8 border-t dark:border-gray-700">
      <div class="mx-auto flex justify-center">
        <Button @click="startListening" size="lg" class="rounded-full h-16 w-16 relative">
          <Mic class="h-8 w-8" />
          <span class="absolute -top-2 -right-2">
            <Activity class="h-4 w-4 animate-pulse" />
          </span>
        </Button>
      </div>
    </footer>
    <Toaster />
  </div>
</template>
