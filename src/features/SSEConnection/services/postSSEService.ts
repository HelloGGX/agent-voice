/**
 * SSE事件数据结构定义
 * @template T 事件数据的泛型类型（默认为any）
 */
export type SSEEventData<T = any> = {
  data: T; // 事件负载数据
  event?: string; // 可选的事件类型标识
  id?: string; // 可选的事件ID
  isUser?: boolean;
};

/**
 * 增强版 SSE 客户端配置选项（支持 POST）
 */
export type SSEClientOptions = {
  url?: string;
  method?: "GET" | "POST"; // 新增方法配置
  body?: BodyInit; // POST 请求体
  withCredentials?: boolean;
  headers?: Record<string, string>;
  retryConfig?: {
    maxRetries?: number;      // 默认3次
    baseDelay?: number;       // 默认1000ms
    backoffFactor?: number;   // 默认2
  };
};

/**
 * 增强版 SSE 客户端（基于 fetch 实现）
 */
export class SSEClient {
  private abortController: AbortController | null = null;
  private eventHandlers = new Map<string, ((data: any) => void)[]>();
  private decoder = new TextDecoder();

  constructor(private options?: SSEClientOptions) {}

  /**
   * 建立 SSE 连接
   */
  async connect(isConnected: globalThis.Ref<boolean, boolean>, reconnect = false) {
    if (reconnect) {
      isConnected.value = false;
      this.abortController = null;
    } else if (this.abortController) return;
    this.abortController = new AbortController();

    try {
      const response = await fetch(this.options?.url || "/api/v1/sse", {
        method: this.options?.method || "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...this.options?.headers,
        },
        body: this.options?.body,
        signal: this.abortController.signal,
        credentials: this.options?.withCredentials ? "include" : "same-origin",
      });

      if (!response.ok) throw new Error(`SSE连接失败: ${response.status}`);
      console.log("SSE服务已连接");
      isConnected.value = true;
      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取事件流");

      // 持续读取流数据
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const eventChunks = this.decoder
          .decode(value) // 解码为文本
          .split("\n\n") // 按 SSE 协议分割事件
          .filter(Boolean); // 过滤空行

        eventChunks.forEach((chunk) => {
          const parsedEvent = this.parseSSEEvent(chunk);
          console.log("parsedEvent:", parsedEvent);

          if (parsedEvent) {
            // 统一触发 message 事件
            this.handleEvent("message", parsedEvent.data);
          }
        });
      }
    } catch (error) {
      isConnected.value = false;
      this.handleEvent("error", error);
      this.handleEvent("close", null);
    }
  }

  /**
   * SSE 事件解析器
   */
  private parseSSEEvent(raw: string): SSEEventData | null {
    const lines = raw.split("\n");
    const result: SSEEventData = {
      data: null,
      event: undefined,
    };

    lines.forEach((line) => {
      const colonIndex = line.indexOf(":");
      if (colonIndex <= 0) return;

      const field = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      switch (field) {
        case "event":
          result.event = value;
          break;
        case "data":
          try {
            result.data = JSON.parse(value);
          } catch {
            result.data = value;
          }
          break;
        case "id":
          result.id = value;
          break;
      }
    });

    // 返回统一格式数据
    return result.data !== null
      ? {
          event: result.event,
          data: {
            event: result.event,
            data: result.data, // 实际数据负载
          },
        }
      : null;
  }

  /**
   * 注册事件处理器（保持与原始 API 兼容）
   */
  on<T>(event: string, callback: (data: T) => void) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(callback);
    this.eventHandlers.set(event, handlers);
  }

  /**
   * 移除事件处理器（保持与原始 API 兼容）
   */
  off(event: string, callback?: (data: any) => void) {
    if (!callback) {
      this.eventHandlers.delete(event);
    } else {
      const handlers = this.eventHandlers.get(event) || [];
      const index = handlers.indexOf(callback);
      if (index > -1) handlers.splice(index, 1);
    }
  }

  /**
   * 关闭连接
   */
  close() {
    this.abortController?.abort();
    this.abortController = null;
    this.handleEvent("close", null);
    this.eventHandlers.clear();
  }

  /**
   * 事件分发处理器
   */
  private handleEvent(eventType: string, data: any) {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.forEach((handler) => handler(data));
  }
}
