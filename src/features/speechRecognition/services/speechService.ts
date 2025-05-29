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
      console.log("🎤 语音识别已启动");
      this.emit("recognition-start");
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.handleRecognitionResult(event);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("❌ 语音识别错误:", event.error, event.message);
      this.emit("recognition-error", {
        error: event.error,
        message: event.message,
      });
    };

    this.recognition.onend = () => {
      console.log("🛑 语音识别结束");
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
  // 开始语音识别
  startRecognition(): void {
    if (!this.recognition) {
      throw new Error("语音识别未初始化");
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error("❌ 启动语音识别失败:", error);
      throw error;
    }
  }
  // 停止语音识别
  stopRecognition(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }
  // 处理语音识别结果
  /**
   * 举个例子：
用户对着麦克风说："今天的天气真好"。
在用户讲话过程中，系统通过"recognition-result"事件不断把中间结果（例如"今…天气…好"）反馈到UI上，让用户看到实时识别过程。
当系统确认用户的完整输入为"今天的天气真好"且置信度足够高时，再单独发出一个"final-result"事件，用于进一步的处理，比如记录日志或自动更新天气显示模块
   * @param event 
   * @returns 
   */
  private handleRecognitionResult(event: SpeechRecognitionEvent): void {
    // 1. 防御性检查 - 确保事件和结果存在
    if (!event?.results || event.results.length === 0) {
      console.warn("语音识别事件无有效结果");
      return;
    }

    // 2. 使用 resultIndex 优化性能 - 只处理新的结果
    const startIndex = event.resultIndex || 0;
    let finalTranscript = "";
    let interimTranscript = "";

    // 3. 从 resultIndex 开始处理，避免重复处理
    for (let i = startIndex; i < event.results.length; i++) {
      const result = event.results[i];

      if (!result?.[0]?.transcript) continue;

      const transcript = result[0].transcript.trim();
      const confidence = result[0].confidence || 0;

      if (result.isFinal) {
        finalTranscript += transcript;

        // 4. 置信度检查 - 只处理高置信度的最终结果
        // "final-result" 事件: 当当前语音段标记为最终，并且置信度超过 0.7 时触发。
        // 这个事件用于触发依赖于确认输入的业务逻辑，比如自动提交或后续处理。
        if (confidence > 0.7) {
          this.emit("final-result", {
            transcript,
            confidence,
            timestamp: Date.now(),
          });
        }
      } else {
        interimTranscript += transcript;
      }
    }

    // 5. 批量发送结果，减少事件频率
    // "recognition-result" 事件: 聚合最终结果和临时结果，提供连续的识别反馈。
    // 这一事件常用于更新UI，让用户实时看到已识别的内容（既包含确认结果，也包含临时识别）
    if (finalTranscript || interimTranscript) {
      this.emit("recognition-result", {
        final: finalTranscript,
        interim: interimTranscript,
        timestamp: Date.now(),
      });
    }
  }
}
