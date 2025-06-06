<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Mic, Activity } from "lucide-vue-next";
import ConversationPanel from "@/components/tempComponents/ConversationPanel.vue";
import { Toaster } from "@/components/ui/sonner";
import "vue-sonner/style.css";

import { useSpeechService } from "@/features/speechRecognition";
import { useSSE } from "@/features/SSEConnection";

const messages = ref<any[]>([]);

messages.value = [
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
];
// 使用语音服务
const { startListening } = useSpeechService();
// 使用SSE服务
const { isConnected, isConnecting, onMessage, onError, onClose } = useSSE();

onMessage((data) => {
  console.log(`[${data.event}]`, data);
  const msg = data;
  msg.isUser = data.event === "user_message";
  messages.value.push(msg);
  // 模拟发消息的回复
  setTimeout(() => {
    const reply = {
      isUser: false,
      content: "这是回复消息",
      text: "这是回复消息",
    };
    messages.value.push(reply);
  }, 4000);
});
onError((err) => {
  console.error("连接错误:", err);
});

onClose(() => {
  console.log("连接关闭");
});

onMounted(() => {
  // toast.error("401", {
  //   description: "test toast",
  // });
});
</script>

<template>
  <div class="h-screen flex flex-col bg-background dark:bg-gray-900">
    <!-- 头部状态栏 -->
    <header class="p-4 border-b dark:border-gray-700">
      <div class="flex items-center justify-between mx-auto">
        <h1 class="text-xl font-semibold dark:text-gray-100">AI语音助手</h1>
        <div v-if="isConnected" class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-green-500" />
          <span class="text-sm text-muted-foreground">在线</span>
        </div>
        <!-- 连接中的loading动画 -->
        <div v-else-if="isConnecting" class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
          <span class="text-sm text-muted-foreground">连接中...</span>
        </div>
        <div v-else class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-red-500" />
          <span class="text-sm text-muted-foreground">离线</span>
        </div>
      </div>
    </header>

    <!-- 对话记录区域 -->
    <ConversationPanel :messages="messages" />

    <!-- 语音控制栏 -->
    <footer class="p-8 border-t dark:border-gray-700">
      <div class="mx-auto flex justify-center">
        <Button
          @click="startListening"
          size="lg"
          class="rounded-full h-16 w-16 relative"
        >
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
