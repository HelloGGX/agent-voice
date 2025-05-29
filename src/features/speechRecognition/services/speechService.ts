export class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private listeners: Map<string, ((data?: Record<string, unknown>) => void)[]> =
    new Map();

  async initialize() {
    this.initializeSpeechRecognition();
  }

  // 初始化语音识别
  private initializeSpeechRecognition(): void {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      throw new Error("浏览器不支持语音识别");
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "zh-CN";

    this.recognition.onstart = () => {
      this.emit("recognition-start");
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      // todo 处理识别结果
      console.log(event);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.emit("recognition-error", {
        error: event.error,
        message: event.message,
      });
    };

    this.recognition.onend = () => {
      this.emit("recognition-end");
    };
  }
  private emit(event: string, data?: Record<string, unknown>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  // 事件监听器管理
  addEventListener(
    event: string,
    callback: (data?: Record<string, unknown>) => void,
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  removeEventListener(
    event: string,
    callback: (data?: Record<string, unknown>) => void,
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}
