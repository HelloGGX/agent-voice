<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Mic, Activity } from "lucide-vue-next";
import { ref, watch, onMounted, onUnmounted } from "vue";
import { useConversation } from "./hooks/useConversation";

const conversationStorage = useConversation();

// 语音识别状态
const isRecording = ref(false);
const transcript = ref("");
const messages = ref<Array<{ text: string; isUser: boolean }>>([]);

const recognition = ref<SpeechRecognition | null>(null);
const isSupported = ref(true);
// 添加语音合成相关状态
const isSpeaking = ref(false);
const SYNTH = window.speechSynthesis;

// 自动保存对话记录
watch(messages, (newVal) => {
  conversationStorage.value  = JSON.stringify(newVal)
}, { deep: true })

// 语音识别逻辑
const toggleRecording = () => {
  if (!isSupported.value) return;

  isRecording.value = !isRecording.value;
  if (isRecording.value) {
    recognition.value?.start();
  } else {
    recognition.value?.stop();
  }
};

// 错误处理函数
const handleRecognitionError = (error: string) => {
  if (error === "not-allowed") {
    console.error("麦克风访问被拒绝");
    // 更新错误状态显示
  }
  isRecording.value = false;
};

// 添加语音合成方法
const speak = (text: string) => {
  if (!SYNTH) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";

  utterance.onstart = () => (isSpeaking.value = true);
  utterance.onend = () => (isSpeaking.value = false);

  SYNTH.speak(utterance);
};

// 在对话记录中添加AI回复时触发
watch(messages, (newVal) => {
  const lastMessage = newVal[newVal.length - 1];
  if (lastMessage && !lastMessage.isUser) {
    speak(lastMessage.text);
  }
});

// 初始化语音识别
onMounted(() => {
  if (conversationStorage.value) {
    messages.value = JSON.parse(conversationStorage.value);
  }
  if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition.value = new SpeechRecognition();
    recognition.value.continuous = true;
    recognition.value.interimResults = true;
    recognition.value.lang = "zh-CN";

    recognition.value.onresult = (event) => {
      const current = event.resultIndex;
      const transcriptText = event.results[current][0].transcript;
      transcript.value = transcriptText;

      // 当说话结束时提交到对话记录
      if (event.results[current].isFinal) {
        messages.value.push({ text: transcriptText, isUser: true });
        transcript.value = "";
      }
    };

    recognition.value.onerror = (event) => {
      handleRecognitionError(event.error);
    };
  } else {
    isSupported.value = false;
  }
});
</script>

<template>
  <div class="h-screen flex flex-col bg-background dark:bg-gray-900">
    <!-- 头部状态栏 -->
    <header class="p-4 border-b dark:border-gray-700">
      <div class="flex items-center justify-between max-w-3xl mx-auto">
        <h1 class="text-xl font-semibold dark:text-gray-100">AI语音助手</h1>
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
          <span class="text-sm text-muted-foreground">在线</span>
        </div>
      </div>
    </header>

    <!-- 对话记录区域 -->
    <main class="flex-1 overflow-y-auto p-4">
      <div class="max-w-3xl mx-auto space-y-6">
        <!-- AI欢迎消息 -->
        <div class="flex gap-3">
          <Avatar class="h-8 w-8">
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
          <Card class="p-4 max-w-[85%]">
            <p class="text-primary">
              您好！我是智能语音助手，请点击下方麦克风开始对话
            </p>
          </Card>
        </div>

        <!-- 对话记录 -->
        <template v-for="(msg, index) in messages" :key="index">
          <div :class="['flex gap-3', msg.isUser ? 'justify-end' : '']">
            <Avatar v-if="!msg.isUser" class="h-8 w-8">
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <Card
              :class="[
                'p-4 max-w-[85%]',
                msg.isUser ? 'bg-primary text-primary-foreground' : '',
              ]"
            >
              <p>{{ msg.text }}</p>
            </Card>
            <Avatar v-if="msg.isUser" class="h-8 w-8">
              <AvatarFallback>您</AvatarFallback>
            </Avatar>
          </div>
        </template>

        <!-- 实时转写 -->
        <div v-if="transcript" class="flex justify-end">
          <Card class="p-4 max-w-[85%] bg-muted/50">
            <div class="flex items-center gap-2 text-muted-foreground">
              <Activity class="h-4 w-4 animate-pulse" />
              <p>{{ transcript }}</p>
            </div>
          </Card>
        </div>
      </div>
    </main>

    <!-- 在模板中添加错误提示 -->
    <div v-if="!isSupported" class="p-4 text-center text-destructive">
      当前浏览器不支持语音功能，请使用最新版Chrome浏览器
    </div>
    <!-- 语音控制栏 -->
    <footer class="p-8 border-t dark:border-gray-700">
      <div class="max-w-3xl mx-auto flex justify-center">
        <Button
          @click="toggleRecording"
          :disabled="!isSupported"
          :variant="isRecording ? 'destructive' : 'default'"
          size="lg"
          class="rounded-full h-16 w-16 relative"
        >
          <Mic class="h-8 w-8" />
          <span v-if="isSpeaking" class="absolute -top-2 -right-2">
            <Activity class="h-4 w-4 animate-pulse" />
          </span>
        </Button>

        <!-- 权限拒绝提示 -->
        <!-- <div v-if="errorMessage" class="text-center text-destructive text-sm">
          <AlertCircle class="h-4 w-4 inline-block mr-1" />
          {{ errorMessage }}
        </div> -->
      </div>
    </footer>
  </div>
</template>
