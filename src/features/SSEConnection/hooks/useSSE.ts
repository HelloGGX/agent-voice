import { ref, onUnmounted, onMounted } from "vue";
import { SSEClient, SSEClientOptions } from "../services/SSEService";

let instance: SSEClient | null = null;
type ReconnectStrategy = {
  maxRetries?: number;      // 最大重试次数（默认3次）
  baseDelay?: number;       // 基础延迟时间（单位ms，默认1000）
  backoffFactor?: number;   // 退避因子（默认2）
};

export function useSSE(
  options: SSEClientOptions,
  reconnectOptions?: ReconnectStrategy
) {
  const isConnected = ref(false);
  const error = ref<Event | null>(null);
  const isReconnecting = ref(false);
  const retryCount = ref(0);
  
  // 重连配置合并默认值
  const { 
    maxRetries = 500,
    baseDelay = 1000,
    backoffFactor = 1.2 
  } = reconnectOptions || {};

  let reconnectTimer: number | null = null;

  const initInstance = () => {
    if (!instance) {
      instance = new SSEClient(options);
      // 监听错误事件时初始化重连机制
      instance.on("error", handleError);
      // 监听标准事件时重置重试计数器
      // 监听连接成功事件
      instance.on("open", () => {
        isConnected.value = true;
        retryCount.value = 0;      // 重置重试计数器
        isReconnecting.value = false;
        console.log("✅ SSE连接成功");
      });
    }
    return instance;
  };

  const handleError = (err: Event) => {
    error.value = err;
    isConnected.value = false;
    
    if (shouldReconnect()) {
      scheduleReconnect();
    } else {
      console.error("无法重连，已达到最大重试次数");
      close(true);
    }
  };
  const shouldReconnect = () => {
    return retryCount.value < maxRetries && !isReconnecting.value;
  };

  const scheduleReconnect = () => {
    isReconnecting.value = true;
    const delay = Math.min(
      Math.floor(baseDelay * Math.pow(backoffFactor, retryCount.value)),
      5000 // 最大延迟5秒
    );
    console.log('delay:', delay)
    reconnectTimer = window.setTimeout(() => {
      retryCount.value += 1;
      // isReconnecting.value = false;
      console.log(`重连中... (${retryCount.value}/${maxRetries})`);
      connect(true);  // 执行重连
    }, delay);
  };

  const connect = (isRetry = false) => {
    if (!isRetry) {
      retryCount.value = 0; // 重置计数器当手动连接时
    }
    if (isReconnecting.value) isReconnecting.value = false;
    
    try {
      const client = initInstance();
      client.connect();
      isConnected.value = true;
      error.value = null;
    } catch (err) {
      handleError(err as Event);
    }
  };

  const close = (manualClose = true) => {
    if (manualClose) {
      // 手动关闭时清除重连逻辑
      retryCount.value = maxRetries + 1;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    }
    
    instance?.close();
    instance = null;
    isConnected.value = false;
    isReconnecting.value = false;
  };

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    close();
  });

  return {
    connect: () => connect(),
    close: () => close(true),
    isConnected,
    isReconnecting,
    error,
    retryCount,
    on: <T>(event: string, callback: (data: T) => void) => {
      return initInstance().on(event, callback);
    },
  };
}