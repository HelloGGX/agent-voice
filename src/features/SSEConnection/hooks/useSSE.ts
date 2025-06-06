import { ref, onUnmounted, onMounted } from "vue";
import {
  SSEClient,
  SSEClientOptions,
  SSEEventData,
} from "../services/postSSEService";

// let instance: SSEClient | null = null;
// type ReconnectStrategy = {
//   maxRetries?: number;      // 最大重试次数（默认3次）
//   baseDelay?: number;       // 基础延迟时间（单位ms，默认1000）
//   backoffFactor?: number;   // 退避因子（默认2）
// };
/**
 * SSE事件处理器定义
 */
type SSEEventMap = {
  message: (data: SSEEventData) => void;
  error: (error: Error) => void;
  close: () => void;
};

export function useSSE(options?: SSEClientOptions) {
  // 新增重连相关状态
  const reconnectCount = ref(0);
  const reconnectTimer = ref<ReturnType<typeof setTimeout> | null>(null);
  const {
    maxRetries = 100,
    baseDelay = 1000,
    backoffFactor = 2,
  } = options?.retryConfig || {};
  const sseClient = new SSEClient(options);
  const isConnecting = ref(true);
  const isConnected = ref(false);
  const error = ref<Error | null>(null);

  // 内部重连方法
  const scheduleReconnect = () => {
    if (reconnectCount.value >= maxRetries) {
      console.warn(`Max reconnect attempts (${maxRetries}) reached`);
      return;
    }

    const delay = baseDelay * Math.pow(backoffFactor, reconnectCount.value);
    reconnectTimer.value = setTimeout(() => {
      reconnectCount.value++;
      connect(maxRetries - reconnectCount.value, true);
    }, delay);
  };

  // 清理重连定时器
  const cleanupReconnect = () => {
    if (reconnectTimer.value) {
      clearTimeout(reconnectTimer.value);
      reconnectTimer.value = null;
    }
  };

  // 事件回调容器
  const eventHandlers = reactive<{
    [K in keyof SSEEventMap]: SSEEventMap[K][];
  }>({
    message: [],
    error: [],
    close: [],
  });

  // 类型安全的处理器创建方法
  const createEventHandler = <K extends keyof SSEEventMap>(type: K) => {
    return (handler: SSEEventMap[K]) => {
      (eventHandlers[type] as SSEEventMap[K][]).push(handler);
      sseClient.on(type, handler as any);
    };
  };

  // 连接管理
   // 修改connect方法
  const connect = async (retries = maxRetries, isReconnect = false) => {
    try {
      isConnecting.value = true;
      await sseClient.connect(isConnected, isReconnect);
      reconnectCount.value = 0; // 连接成功重置计数器
    } catch (err) {
      if (retries > 0) scheduleReconnect();
    } finally {
      isConnecting.value = false;
    }
  };

  // 事件监听器绑定
  const onMessage = createEventHandler("message");
  const onError = createEventHandler("error");
  const onClose = createEventHandler("close");

  // 监听close事件（内部处理）
  sseClient.on('close', () => {
    cleanupReconnect();
    if (reconnectCount.value < maxRetries) scheduleReconnect();
  });

  onMounted(() => {
    connect();
  });

  // 自动清理
  onUnmounted(() => {
    sseClient.close();
     cleanupReconnect();
    Object.keys(eventHandlers).forEach((type) => {
      const handlers = eventHandlers[type as keyof SSEEventMap];
      handlers.forEach((handler) => sseClient.off(type, handler));
    });
  });

  return {
    connect,
    close: sseClient.close.bind(sseClient),
    onMessage,
    onError,
    onClose,
    isConnecting,
    isConnected,
    error,
  };
}
