/**
 * SSE事件数据结构定义
 * @template T 事件数据的泛型类型（默认为any）
 */
export type SSEEventData<T = any> = {
  data: T;        // 事件负载数据
  event?: string; // 可选的事件类型标识
  id?: string;    // 可选的事件ID
};

/**
 * SSE客户端配置选项
 */
export type SSEClientOptions = {
  url: string;                   // 必填的SSE服务地址
  withCredentials?: boolean;     // 是否携带跨域凭证
  headers?: Record<string, string>; // 自定义请求头
};

/**
 * SSE客户端核心类
 * 封装了EventSource的标准实现，提供更友好的API
 */
export class SSEClient {
  private eventSource: EventSource | null = null;          // 原生EventSource实例
  private eventHandlers = new Map<string, (data: any) => void>(); // 事件处理器映射表

  /**
   * 构造函数
   * @param options SSE客户端配置选项
   */
  constructor(private options: SSEClientOptions) {}

  /**
   * 建立SSE连接
   * 重复调用不会创建新连接
   */
  connect() {
    if (this.eventSource) return;

    // 初始化EventSource实例
    this.eventSource = new EventSource(this.options.url, {
      withCredentials: this.options.withCredentials ?? false,
    });

    // 注册标准消息事件处理器
    this.eventSource.onmessage = (event: MessageEvent) => {
      this.handleEvent("message", event);
    };

    // open事件监听
    this.eventSource.onopen = (event: Event) => {
      this.handleEvent("open", event);
    };

    // 注册错误事件处理器
    this.eventSource.onerror = (error: Event) => {
      this.handleEvent("error", error);
    };
  }

  /**
   * 注册自定义事件处理器
   * @template T 事件数据类型
   * @param event 事件名称（支持自定义事件类型）
   * @param callback 事件处理回调函数
   */
  on<T>(event: string, callback: (data: T) => void) {
    this.eventHandlers.set(event, callback);
    
    // 为EventSource添加原生事件监听
    this.eventSource?.addEventListener(event, (e: MessageEvent) => {
      callback(JSON.parse(e.data)); // 自动解析JSON数据
    });
  }

  /**
   * 关闭SSE连接
   * 清理所有事件监听和资源引用
   */
  close() {
    this.eventSource?.close();
    this.eventSource = null;
    this.eventHandlers.clear();
  }

  /**
   * 统一事件分发处理器
   * @param eventType 事件类型标识
   * @param event 原生事件对象
   */
  private handleEvent(eventType: string, event: MessageEvent | Event) {
    const handler = this.eventHandlers.get(eventType);
    if (handler) {
      // 根据事件类型提取有效数据（MessageEvent包含data属性）
      handler("data" in event ? event.data : null);
    }
  }
}