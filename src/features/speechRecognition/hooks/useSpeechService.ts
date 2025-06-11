import { SpeechService } from '../services/speechService';

export function useSpeechService() {
  let speechService: SpeechService | null = null;

  const initializeSpeechService = async () => {
    console.log('麦克风权限检查通过，创建语音服务...');
    speechService = new SpeechService();
    speechService.initialize();
    setupSpeechEventListeners();
  };

  // 注册语音事件监听器
  const setupSpeechEventListeners = () => {
    if (!speechService) return;

    // 语音识别开始
    speechService.addEventListener('recognition-start', () => {
      console.log('语音识别开始');
    });

    // 语音识别结果
    speechService.addEventListener('recognition-result', (data: any) => {
      if (data.final) {
        console.log('语音识别最终结果:', data.final);
      }
    });

    // 最终结果处理
    speechService.addEventListener('final-result', handleFinalResult);

    // 唤醒词检测
    speechService.addEventListener('wake-word-detected', handleWakeWordDetected);

    // 语音识别结束
    speechService.addEventListener('recognition-end', handleRecognitionEnd);

    // 语音识别错误
    speechService.addEventListener('recognition-error', handleRecognitionError);
  };

  // 生命周期钩子
  onMounted(async () => {
    try {
      await initializeSpeechService();
    } catch (error) {
      console.error('组件挂载时初始化语音服务失败:', error);
    }
  });

  // 开始监听
  function startListening() {
    if (!speechService) {
      console.error('语音服务未初始化');
      return;
    }
    try {
      speechService.startRecognition();
    } catch (error: any) {
      console.error('启动语音监听失败:', error);
    }
  }
  // 停止监听
  function stopListening() {
    if (!speechService) return;
    speechService.stopRecognition();
  }
  function handleFinalResult() {}
  function handleWakeWordDetected(data: any) {
    console.log('唤醒词检测到:', data);
  }
  function handleRecognitionEnd() {}
  function handleRecognitionError() {}

  return {
    startListening,
    stopListening,
  };
}
