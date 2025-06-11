<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Mic, Activity } from "lucide-vue-next";
import ConversationPanel from "@/components/tempComponents/ConversationPanel.vue";
import HeaderBar from "@/components/tempComponents/HeaderBar.vue";
import { Toaster } from "@/components/ui/sonner";
import { useMachine } from "@xstate/vue";
import { useSpeechService } from "@/features/speechRecognition";
import { createBrowserInspector } from "@statelyai/inspect";
import "vue-sonner/style.css";
import { SSEStateMachine } from "./features/SSEConnection";

const { inspect } = createBrowserInspector({ autoStart: false });
const { snapshot: SSESnapshot, send } = useMachine(SSEStateMachine, { inspect });

watch(
  () => SSESnapshot.value,
  (snapshot) => {
    console.log("watchSSESnapshot", snapshot.value, typeof snapshot.value);
  },
  {
    immediate: true,
  },
);
// 使用语音服务
const { startListening } = useSpeechService();
// 使用SSE服务
// const { onMessage, onError, onClose } = useSSE(SSEactorRef);

/**
 * SSE服务状态信息
 */
const connectState = computed(() => {
  const snapshotValue = SSESnapshot.value;
  if (snapshotValue.matches("idle")) return "idle";
  if (snapshotValue.matches("connecting")) return "connecting";
  if (snapshotValue.matches("open")) return "open";
  if (snapshotValue.matches("closed")) return "closed";
  return "unknown";
});

const messages = computed(() => {
  return (
    SSESnapshot.value?.context?.messages || [
      {
        id: "1",
        text: "您好！我是智能语音助手，请点击下方麦克风开始对话",
        isUser: false,
      },
      {
        id: "1",
        text: "今天杭州天气如何？",
        isUser: true,
      },
      {
        id: "2",
        text: "杭州今天多云转晴，气温18-25℃，东风2级，适合户外活动。",
        isUser: false,
      },
      {
        id: "3",
        text: "推荐一家西湖边的餐厅",
        isUser: true,
      },
      {
        id: "4",
        text: "推荐「楼外楼」，经典杭帮菜餐厅，位于孤山路30号，推荐东坡肉和西湖醋鱼。建议提前预约。",
        isUser: false,
      },
    ]
  );
});

onMounted(() => {
  // toast.error("401", {
  //   description: "test toast",
  // });
  // SSEactorRef.start();
  send({ type: "connect" });
});
</script>

<template>
  <div class="h-screen flex flex-col bg-background dark:bg-gray-900">
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
