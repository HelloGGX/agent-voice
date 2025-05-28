// SSE客户端服务
export interface SSEMessage {
  type: "message" | "flight_info" | "boarding_pass" | "error" | "status";
  data: any;
  timestamp: number;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private listeners: Map<string, Function[]> = new Map();

  constructor(private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 如果已经有连接且状态正常，直接返回
        if (
          this.eventSource &&
          this.eventSource.readyState === EventSource.OPEN
        ) {
          console.log("SSE连接已存在，跳过重复连接");
          resolve();
          return;
        }

        // 如果有现有连接但状态不正常，先断开
        if (this.eventSource) {
          console.log("断开现有SSE连接");
          this.eventSource.close();
          this.eventSource = null;
        }

        console.log("尝试连接到SSE服务器:", this.url);
        this.eventSource = new EventSource(this.url);

        this.eventSource.onopen = () => {
          console.log("SSE连接已建立");
          this.reconnectAttempts = 0;
          this.emit("connected", { status: "connected" });
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          try {
            console.log("收到SSE消息:", event.data);
            const message: SSEMessage = JSON.parse(event.data);
            this.emit("message", message);
          } catch (error) {
            console.error("解析SSE消息失败:", error);
          }
        };

        this.eventSource.onerror = (error) => {
          console.error("SSE连接错误:", error);
          console.error(
            "EventSource readyState:",
            this.eventSource?.readyState
          );
          this.emit("error", error);

          // 如果是连接失败，立即reject
          if (this.eventSource?.readyState === EventSource.CLOSED) {
            reject(new Error("SSE连接失败"));
          } else {
            this.handleReconnect();
          }
        };

        // 监听特定类型的消息
        this.addEventListener("flight_info", this.handleFlightInfo.bind(this));
        this.addEventListener(
          "boarding_pass",
          this.handleBoardingPass.bind(this)
        );
      } catch (error) {
        console.error("创建SSE连接失败:", error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.emit("disconnected", { status: "disconnected" });
    }
  }

  // 发送消息到服务器
  async sendMessage(message: any): Promise<void> {
    try {
      const response = await fetch(
        `${this.url.replace("/sse", "/api/message")}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("发送消息失败:", error);
      throw error;
    }
  }

  // 事件监听器管理
  addEventListener(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  private handleReconnect(): void {
    // 如果已经有正常连接，不进行重连
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
      console.log("SSE连接正常，取消重连");
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `SSE重连第${this.reconnectAttempts}次，${this.reconnectInterval}ms后重试`
      );

      setTimeout(() => {
        // 重连前再次检查连接状态
        if (
          this.eventSource &&
          this.eventSource.readyState === EventSource.OPEN
        ) {
          console.log("SSE连接已恢复，取消重连");
          return;
        }

        this.connect().catch((error) => {
          console.error("SSE重连失败:", error);
        });
      }, this.reconnectInterval);

      this.reconnectInterval *= 2; // 指数退避
    } else {
      console.error("SSE重连失败，已达到最大重试次数");
      this.emit("max_reconnect_attempts", {
        attempts: this.maxReconnectAttempts,
      });
    }
  }

  // 处理特定类型的消息
  private handleFlightInfo(message: SSEMessage): void {
    console.log("收到航班信息:", message.data);
    this.emit("flight_info_received", message.data);
  }

  private handleBoardingPass(message: SSEMessage): void {
    console.log("收到登机牌信息:", message.data);
    this.emit("boarding_pass_received", message.data);
  }

  // 获取连接状态
  getReadyState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

// 创建单例实例
const defaultUrl = "http://localhost:3000/sse";
const sseUrl = import.meta.env.VITE_SSE_URL || defaultUrl;
console.log("SSE URL配置:", sseUrl);

export const sseClient = new SSEClient(sseUrl);
