<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Mic, Activity } from "lucide-vue-next";

import { useSpeechService } from "@/features/speechRecognition";

const messages = ref<{ id: string; text: string; isUser: boolean }[]>([]);

// 使用语音服务
const { startListening } = useSpeechService();

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
        <template v-for="msg in messages" :key="msg.id">
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
        <div class="flex justify-end">
          <Card class="p-4 max-w-[85%] bg-muted/50">
            <div class="flex items-center gap-2 text-muted-foreground">
              <Activity class="h-4 w-4 animate-pulse" />
              <p>{{}}</p>
            </div>
          </Card>
        </div>
      </div>
    </main>

    <!-- 语音控制栏 -->
    <footer class="p-8 border-t dark:border-gray-700">
      <div class="max-w-3xl mx-auto flex justify-center">
        <Button @click="startListening" size="lg" class="rounded-full h-16 w-16 relative">
          <Mic class="h-8 w-8" />
          <span class="absolute -top-2 -right-2">
            <Activity class="h-4 w-4 animate-pulse" />
          </span>
        </Button>
      </div>
    </footer>
  </div>
</template>
