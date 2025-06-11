<script setup lang="ts">
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { debounce } from '@/utils/optimization';
import { Activity } from 'lucide-vue-next';
import JourneyCard from './JourneyCard.vue';
import { Message } from '@/types';
const props = withDefaults(
  defineProps<{
    messages: Array<Message>;
    // 假设还有其他属性，例如：
    // otherProp?: string;
  }>(),
  {
    messages: () => [],
    // otherProp: 'default value',
  },
);
watch(
  () => props.messages,
  (newVal) => {
    console.log('newVal', newVal);
  },
);
const scrollContainer = ref<HTMLElement>();
const isNearBottom = ref(true);
const showScrollPrompt = ref(false);
let prevMessagesLength = props.messages.length;

// 滚动处理（带防抖）
const handleScroll = debounce(() => {
  if (!scrollContainer.value) return;

  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;
  const threshold = 100; // 滚动到底部的判定阈值

  isNearBottom.value = scrollTop + clientHeight >= scrollHeight - threshold;

  // 当有新消息且用户离开底部时显示提示
  showScrollPrompt.value = !isNearBottom.value && props.messages.length > prevMessagesLength;
}, 150);

// 滚动到底部方法
const scrollToBottom = () => {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTo({
        top: scrollContainer.value.scrollHeight,
        behavior: 'smooth',
      });
      showScrollPrompt.value = false;
      prevMessagesLength = props.messages.length;
    }
  });
};

// 监听消息变化
watch(
  () => props.messages,
  (newVal) => {
    if (isNearBottom.value) {
      scrollToBottom();
    } else if (newVal.length > prevMessagesLength) {
      showScrollPrompt.value = true;
    }
    prevMessagesLength = newVal.length;
  },
  { deep: true, flush: 'post' },
);

// 初始化滚动监听
onMounted(() => {
  if (scrollContainer.value) {
    scrollContainer.value.addEventListener('scroll', handleScroll);

    // 新增初始滚动逻辑
    nextTick(() => {
      scrollToBottom();
      // 初始化消息长度记录
      prevMessagesLength = props.messages.length;
    });
  }
});

onUnmounted(() => {
  if (scrollContainer.value) {
    scrollContainer.value.removeEventListener('scroll', handleScroll);
  }
});
</script>

<template>
  <main ref="scrollContainer" class="flex-1 overflow-y-auto p-4 relative">
    <div class="mx-auto space-y-6">
      <!-- 对话记录 -->
      <template v-for="(msg, index) in messages" :key="index">
        <div :class="['flex gap-3', msg.data.event === 'human_message' ? 'justify-end' : '']">
          <Avatar v-if="msg.data.event === 'ai_message'" class="h-12 w-12">
            <AvatarFallback>助手</AvatarFallback>
          </Avatar>
          <Card
            :class="[
              'p-4 max-w-[85%]',
              msg.data.event === 'human_message' ? 'bg-primary text-primary-foreground' : '',
            ]"
          >
            <JourneyCard
              v-if="msg.data.event === 'journey'"
              :data="Array.isArray(msg.data?.data) ? msg.data.data : [msg.data.data]"
            />
            <p v-else>{{ msg.data.data }}</p>
          </Card>
          <Avatar v-if="msg.data.event === 'human_message'" class="h-12 w-12">
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
    <!-- 新消息提示按钮 -->
    <transition
      enter-active-class="transition-opacity duration-300"
      leave-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <button
        v-if="showScrollPrompt"
        @click="scrollToBottom"
        class="fixed bottom-35 left-1/2 -translate-x-1/2 text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-blue-400/90 transform cursor-pointer bg-blue-400"
      >
        <Activity class="h-4 w-4" />
        有新消息
      </button>
    </transition>
  </main>
</template>

<style scoped>
/* .journey-card {
  @apply space-y-4 max-w-3xl mx-auto;
  animation: slide-in 0.3s ease-out;
} */

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
