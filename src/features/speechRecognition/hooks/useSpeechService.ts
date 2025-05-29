import { SpeechService } from "../services/speechService";

export function useSpeechService() {
  let speechService: SpeechService | null = null;

  const initializeSpeechService = async () => {
    console.log("麦克风权限检查通过，创建语音服务...");
    speechService = new SpeechService();
    speechService.initialize();
  };

  // 生命周期钩子
  onMounted(async () => {
    try {
      await initializeSpeechService();
    } catch (error) {
      console.error("组件挂载时初始化语音服务失败:", error);
    }
  });
}
