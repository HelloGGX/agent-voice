// 语音处理服务
import type { VoiceSettings, AudioAnalysisResult } from "@/types";

export class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioWorklet: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  private isInitialized = false;
  private isRecordingMode = false; // 标记是否处于录音模式

  private listeners: Map<string, Function[]> = new Map();

  constructor(private settings: VoiceSettings) {}

  // 初始化语音服务
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.initializeAudioContext();
      this.initializeSpeechRecognition();
      await this.initializeMediaStream();
      this.isInitialized = true;
      console.log("语音服务初始化完成");
    } catch (error) {
      console.error("语音服务初始化失败:", error);
      throw error;
    }
  }

  // 初始化音频上下文
  private async initializeAudioContext(): Promise<void> {
    this.audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    // 创建分析器
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    // 加载音频工作节点用于降噪
    try {
      await this.audioContext.audioWorklet.addModule("/audio-processor.js");
      this.audioWorklet = new AudioWorkletNode(
        this.audioContext,
        "noise-suppressor",
      );
    } catch (error) {
      console.warn("音频工作节点加载失败，将使用基础降噪:", error);
    }
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
    this.recognition.lang = this.settings.language;

    this.recognition.onstart = () => {
      this.emit("recognition-start");
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.handleRecognitionResult(event);
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

  // 初始化媒体流
  private async initializeMediaStream(): Promise<void> {
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
        channelCount: 1,
      },
    };

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);

    if (this.audioContext && this.analyser) {
      const source = this.audioContext.createMediaStreamSource(this.stream);

      // 如果有降噪工作节点，则使用它
      if (this.audioWorklet) {
        source.connect(this.audioWorklet);
        this.audioWorklet.connect(this.analyser);
      } else {
        source.connect(this.analyser);
      }
    }

    // 初始化录音器
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: "audio/webm;codecs=opus",
    });

    // 存储录音数据
    let recordedChunks: Blob[] = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
        this.emit("audio-data", event.data);
      }
    };

    // 录音停止时处理完整的音频数据
    this.mediaRecorder.onstop = () => {
      if (recordedChunks.length > 0) {
        const completeBlob = new Blob(recordedChunks, {
          type: "audio/webm;codecs=opus",
        });
        this.emit("recording-complete", completeBlob);
        recordedChunks = []; // 清空数据
      }
    };
  }

  // 开始语音识别
  startRecognition(): void {
    if (!this.recognition) {
      throw new Error("语音识别未初始化");
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error("启动语音识别失败:", error);
    }
  }

  // 停止语音识别
  stopRecognition(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  // 开始录音
  startRecording(): void {
    if (!this.mediaRecorder) {
      throw new Error("录音器未初始化");
    }

    if (this.mediaRecorder.state === "inactive") {
      this.isRecordingMode = true;

      // 确保语音识别在录音期间运行
      this.ensureRecognitionRunning();

      this.mediaRecorder.start(1000); // 每秒一个数据块
      this.emit("recording-start");
    }
  }

  // 停止录音
  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.stop();
      this.isRecordingMode = false;

      // 停止语音识别
      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch (error) {
          console.log("停止录音期间语音识别时出错:", error);
        }
      }

      this.emit("recording-stop");
    }
  }

  // 确保语音识别正在运行
  private ensureRecognitionRunning(): void {
    if (!this.recognition) return;

    try {
      // 先停止当前的识别（如果有的话）
      this.recognition.stop();

      // 短暂延迟后重新启动
      setTimeout(() => {
        if (this.recognition && this.isRecordingMode) {
          try {
            this.recognition.start();
            console.log("录音模式下语音识别已启动");
          } catch (error) {
            console.log("录音模式下启动语音识别时出错:", error);
          }
        }
      }, 100);
    } catch (error) {
      console.log("确保语音识别运行时出错:", error);
    }
  }

  // 分析音频数据
  analyzeAudio(): AudioAnalysisResult | null {
    if (!this.analyser) return null;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // 计算音量
    const volume = this.calculateVolume(dataArray);

    // 获取频率数据
    const frequency = Array.from(dataArray).slice(0, 50); // 取前50个频率点

    return {
      volume,
      frequency,
      isAboveThreshold: volume > this.settings.volumeThreshold[0],
    };
  }

  // 计算音量
  private calculateVolume(dataArray: Uint8Array): number {
    const sum = dataArray.reduce((acc, value) => acc + value, 0);
    return (sum / dataArray.length / 255) * 100;
  }

  // 处理语音识别结果
  private handleRecognitionResult(event: SpeechRecognitionEvent): void {
    let finalTranscript = "";
    let interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      const confidence = event.results[i][0].confidence;

      if (event.results[i].isFinal) {
        finalTranscript += transcript;

        // 如果不是录音模式，检查唤醒词
        if (
          !this.isRecordingMode &&
          this.settings.wakeWordEnabled &&
          this.checkWakeWord(transcript)
        ) {
          this.emit("wake-word-detected", { transcript, confidence });
          // 如果检测到唤醒词，不触发 final-result 事件
          return;
        }

        // 如果是录音模式或正常语音识别，触发 final-result 事件
        this.emit("final-result", {
          transcript,
          confidence,
          isRecorded: this.isRecordingMode,
        });
      } else {
        interimTranscript += transcript;
        this.emit("interim-result", { transcript, confidence });
      }
    }

    if (finalTranscript || interimTranscript) {
      this.emit("recognition-result", {
        final: finalTranscript,
        interim: interimTranscript,
        isRecorded: this.isRecordingMode,
      });
    }
  }

  // 检查唤醒词
  private checkWakeWord(transcript: string): boolean {
    const cleanTranscript = this.normalizeText(transcript);
    const wakeWord = this.normalizeText(this.settings.wakeWord);

    console.log("唤醒词匹配调试:", {
      原始输入: transcript,
      标准化输入: cleanTranscript,
      唤醒词: this.settings.wakeWord,
      标准化唤醒词: wakeWord,
    });

    // 1. 精确匹配
    if (cleanTranscript === wakeWord) {
      console.log("✅ 精确匹配成功");
      return true;
    }

    // 2. 包含匹配
    if (cleanTranscript.includes(wakeWord)) {
      console.log("✅ 包含匹配成功");
      return true;
    }

    // 3. 分词匹配 - 检查是否包含所有关键词
    if (this.containsAllKeywords(cleanTranscript, wakeWord)) {
      console.log("✅ 关键词匹配成功");
      return true;
    }

    // 4. 模糊匹配
    if (this.fuzzyMatch(cleanTranscript, wakeWord)) {
      console.log("✅ 模糊匹配成功");
      return true;
    }

    // 5. 语音识别常见错误匹配
    if (this.speechRecognitionErrorMatch(cleanTranscript, wakeWord)) {
      console.log("✅ 语音识别错误匹配成功");
      return true;
    }

    console.log("❌ 所有匹配方式都失败");
    return false;
  }

  // 文本标准化
  private normalizeText(text: string): string {
    return (
      text
        .toLowerCase()
        .trim()
        // 移除标点符号
        .replace(
          /[，。！？、；：""''（）【】《》〈〉「」『』〔〕［］｛｝]/g,
          "",
        )
        .replace(/[,.!?;:"'()\[\]{}<>]/g, "")
        // 移除多余空格
        .replace(/\s+/g, "")
        // 处理常见的语音识别错误
        .replace(/你好/g, "你好")
        .replace(/助手/g, "助手")
    );
  }

  // 分词匹配 - 检查是否包含所有关键词
  private containsAllKeywords(transcript: string, wakeWord: string): boolean {
    // 将唤醒词分解为关键词
    const keywords = this.extractKeywords(wakeWord);

    console.log("关键词匹配调试:", {
      提取的关键词: keywords,
      输入文本: transcript,
    });

    // 检查转录文本是否包含所有关键词
    const results = keywords.map((keyword) => {
      const directMatch = transcript.includes(keyword);
      const similarMatch = this.findSimilarWord(transcript, keyword);
      const matched = directMatch || similarMatch;

      console.log(
        `关键词 "${keyword}": 直接匹配=${directMatch}, 相似匹配=${similarMatch}, 结果=${matched}`,
      );

      return matched;
    });

    const allMatched = results.every((result) => result);
    console.log("所有关键词匹配结果:", allMatched);

    return allMatched;
  }

  // 提取关键词
  private extractKeywords(text: string): string[] {
    // 对于中文，按字符分割并过滤常用词
    const commonWords = ["的", "了", "在", "是", "我", "你", "他", "她", "它"];

    // 组合成有意义的词
    const keywords: string[] = [];

    // 添加完整文本
    keywords.push(text);

    // 添加主要词汇
    if (text.includes("你好")) keywords.push("你好");
    if (text.includes("助手")) keywords.push("助手");
    if (text.includes("小助手")) keywords.push("小助手");
    if (text.includes("语音助手")) keywords.push("语音助手");

    return keywords.filter(
      (word) => word.length > 0 && !commonWords.includes(word),
    );
  }

  // 查找相似词
  private findSimilarWord(text: string, keyword: string): boolean {
    const synonyms: { [key: string]: string[] } = {
      你好: ["您好", "你好", "哈喽", "嗨", "hello", "hi"],
      助手: [
        "助手",
        "小助手",
        "助理",
        "小助理",
        "机器人",
        "小机器人",
        "智能助手",
      ],
    };

    const keywordSynonyms = synonyms[keyword] || [];
    return keywordSynonyms.some((synonym) => text.includes(synonym));
  }

  // 语音识别常见错误匹配
  private speechRecognitionErrorMatch(
    transcript: string,
    wakeWord: string,
  ): boolean {
    // 常见的语音识别错误映射
    const errorMappings: { [key: string]: string[] } = {
      你好助手: [
        "你好助手",
        "你好，助手",
        "你好 助手",
        "您好助手",
        "您好，助手",
        "你好小助手",
        "你好语音助手",
        "嗨助手",
        "哈喽助手",
        "你好机器人",
        "你好小机器人",
      ],
    };

    const possibleMatches = errorMappings[wakeWord] || [];
    return possibleMatches.some((match) => {
      const normalizedMatch = this.normalizeText(match);
      const normalizedTranscript = this.normalizeText(transcript);

      return (
        normalizedTranscript.includes(normalizedMatch) ||
        normalizedMatch.includes(normalizedTranscript) ||
        this.calculateSimilarity(normalizedTranscript, normalizedMatch) > 0.7
      );
    });
  }

  // 计算文本相似度
  private calculateSimilarity(text1: string, text2: string): number {
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  // 计算编辑距离
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  // 模糊匹配
  private fuzzyMatch(text: string, pattern: string): boolean {
    // 使用更智能的相似度计算
    const similarity = this.calculateSimilarity(text, pattern);

    // 对于短文本（如唤醒词），使用更宽松的阈值
    const threshold = pattern.length <= 4 ? 0.6 : 0.7;

    return similarity >= threshold;
  }

  // 公共方法：检查唤醒词
  public isWakeWord(transcript: string): boolean {
    return this.checkWakeWord(transcript);
  }

  // 公共方法：在录音模式下重启语音识别
  public restartRecognitionInRecordingMode(): void {
    if (this.isRecordingMode) {
      console.log("在录音模式下重启语音识别");
      this.ensureRecognitionRunning();
    }
  }

  // 公共方法：检查是否处于录音模式
  public isInRecordingMode(): boolean {
    return this.isRecordingMode;
  }

  // 更新设置
  updateSettings(newSettings: Partial<VoiceSettings>): void {
    Object.assign(this.settings, newSettings);

    if (this.recognition) {
      this.recognition.lang = this.settings.language;
    }
  }

  // 获取音频流
  getAudioStream(): MediaStream | null {
    return this.stream;
  }

  // 检查是否支持语音识别
  static isSupported(): boolean {
    return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
  }

  // 检查是否有麦克风权限
  static async checkMicrophonePermission(): Promise<boolean> {
    try {
      // 在 Tauri 环境中，权限检查可能有所不同
      const isTauri = (window as any).__TAURI__ !== undefined;

      if (isTauri) {
        console.log("检测到Tauri环境，尝试直接获取媒体流...");
        // 在 Tauri 中直接尝试获取媒体流
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

          // 成功获取，立即停止所有轨道
          stream.getTracks().forEach((track) => track.stop());
          console.log("Tauri环境下麦克风权限检查通过");
          return true;
        } catch (error: any) {
          console.error("Tauri环境下麦克风权限检查失败:", error);

          // 检查具体的错误类型
          if (error.name === "NotAllowedError") {
            console.error("麦克风权限被拒绝，请在系统设置中授权");
          } else if (error.name === "NotFoundError") {
            console.error("未找到麦克风设备");
          } else if (error.name === "NotSupportedError") {
            console.error("浏览器不支持麦克风访问");
          }

          return false;
        }
      }

      // 浏览器环境的权限检查
      if ("permissions" in navigator) {
        const result = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        console.log("麦克风权限状态:", result.state);

        if (result.state === "granted") {
          return true;
        } else if (result.state === "denied") {
          console.warn("麦克风权限被拒绝");
          return false;
        }
        // 如果是 'prompt' 状态，继续尝试获取媒体流
      }

      // 尝试获取媒体流来触发权限请求
      console.log("尝试请求麦克风权限...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 如果成功获取，立即停止所有轨道
      stream.getTracks().forEach((track) => track.stop());
      console.log("麦克风权限检查通过");
      return true;
    } catch (error: any) {
      console.error("麦克风权限检查失败:", error);

      // 提供更详细的错误信息
      if (error.name === "NotAllowedError") {
        console.error("用户拒绝了麦克风权限请求");
      } else if (error.name === "NotFoundError") {
        console.error("未找到可用的麦克风设备");
      } else if (error.name === "NotSupportedError") {
        console.error("当前环境不支持麦克风访问");
      } else if (error.name === "SecurityError") {
        console.error("安全错误：可能是HTTPS要求或其他安全限制");
      }

      return false;
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

  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  // 清理资源
  dispose(): void {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.listeners.clear();
    this.isInitialized = false;
  }
}
