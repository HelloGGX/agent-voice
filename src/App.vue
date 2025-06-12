<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Mic, Activity } from 'lucide-vue-next';
import ConversationPanel from '@/components/tempComponents/ConversationPanel.vue';
import HeaderBar from '@/components/tempComponents/HeaderBar.vue';
import { Toaster } from '@/components/ui/sonner';
import { createActor } from 'xstate';
import { useSpeechService } from '@/features/speechRecognition';
import 'vue-sonner/style.css';
import { SSEState, SSEStateMachine } from './features/SSEConnection';

// 创建 SSE 状态机实例
const sseActor = createActor(SSEStateMachine, {
  // 可以在这里传入自定义配置
  // input: {
  //   options: {
  //     url: '/api/v1/sse',
  //     headers: {
  //       'Authorization': 'Bearer your-token',
  //     },
  //   },
  //   retryMaxCount: 5,
  // }
});

// 启动状态机
sseActor.start();

// 响应式状态
const sseSnapshot = ref(sseActor.getSnapshot());

// 监听状态机变化
sseActor.subscribe((snapshot) => {
  sseSnapshot.value = snapshot;
  console.log('SSE状态变化:', snapshot.value, snapshot.context);
});

// 计算当前连接状态
const connectState = computed<SSEState>(() => {
  return sseSnapshot.value.value as SSEState;
});

// 计算接收到的消息
const messages = computed(() => {
  return sseSnapshot.value.context.messages || [];
});

// 计算错误信息
const lastError = computed(() => {
  return sseSnapshot.value.context.lastError;
});

// 使用语音服务
const { startListening } = useSpeechService();

// SSE 控制方法
const connectSSE = () => {
  sseActor.send({ type: 'CONNECT' });
};

const resetSSE = () => {
  sseActor.send({ type: 'RESET' });
};

// 监听错误状态，自动显示错误信息
watch(lastError, (error) => {
  if (error) {
    console.error('SSE连接错误:', error.message);
    // 可以在这里添加 toast 通知
    // toast.error('连接错误', { description: error.message });
  }
});

// 组件挂载时自动连接
onMounted(() => {
  connectSSE();
});

// 组件卸载时清理
onBeforeUnmount(() => {
  sseActor.stop();
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
      <div class="mx-auto flex justify-center gap-4">
        <!-- 语音按钮 -->
        <Button @click="startListening" size="lg" class="rounded-full h-16 w-16 relative">
          <Mic class="h-8 w-8" />
          <span class="absolute -top-2 -right-2">
            <Activity class="h-4 w-4 animate-pulse" />
          </span>
        </Button>
        
        <!-- SSE 控制按钮（开发调试用） -->
        <div class="flex gap-2 items-center">
          <Button 
            v-if="connectState === 'idle'" 
            @click="connectSSE" 
            size="sm" 
            variant="outline"
          >
            开始连接
          </Button>

          <Button 
            v-if="connectState === 'failed'" 
            @click="resetSSE" 
            size="sm" 
            variant="destructive"
          >
            重置重试
          </Button>
          
          <!-- 显示当前重试状态 -->
          <div v-if="connectState === 'retry' || connectState === 'delaying'" class="text-xs">
            <div class="text-orange-500">
              {{ connectState === 'retry' ? '准备重试...' : '等待重试...' }}
            </div>
            <div class="text-muted-foreground">
              ({{ sseSnapshot.context.retryCount }}/{{ sseSnapshot.context.retryMaxCount }})
            </div>
          </div>
        </div>
      </div>
      
      <!-- 连接状态信息 -->
      <div class="text-center mt-4 text-sm text-muted-foreground">
        <div class="flex justify-center items-center gap-2">
          <span>连接状态:</span>
          <span 
            :class="{
              'text-green-500': connectState === 'open',
              'text-blue-500': connectState === 'connecting',
              'text-orange-500': connectState === 'retry' || connectState === 'delaying',
              'text-red-500': connectState === 'failed',
              'text-gray-500': connectState === 'idle'
            }"
          >
            {{
              {
                'idle': '空闲',
                'connecting': '连接中...',
                'open': '已连接',
                'retry': '重试中',
                'delaying': '延迟重试',
                'failed': '连接失败'
              }[connectState]
            }}
          </span>
        </div>
        
        <div v-if="lastError" class="text-red-500 mt-1">
          {{ lastError.message }}
        </div>
        
        <div v-if="messages.length > 0" class="mt-1">
          已接收 {{ messages.length }} 条消息
        </div>
      </div>
    </footer>
    
    <Toaster />
  </div>
</template>
