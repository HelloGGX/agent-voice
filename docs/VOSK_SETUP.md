# Vosk 离线语音识别集成指南

## 概述

本项目集成了Vosk离线语音识别引擎，支持完全离线的语音识别功能。Vosk具有以下优势：

- ✅ **完全离线**：无需网络连接即可使用
- ✅ **多语言支持**：支持中文、英文等多种语言
- ✅ **高精度**：基于Kaldi的先进语音识别技术
- ✅ **实时识别**：支持流式音频处理
- ✅ **跨平台**：支持Web、移动端、桌面端

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 下载语音模型

#### 中文模型（推荐）

**小型模型（42MB）**
```bash
# 下载地址
https://alphacephei.com/vosk/models/vosk-model-small-cn-0.22.zip

# 解压到项目的 public/models/ 目录
mkdir -p public/models
cd public/models
wget https://alphacephei.com/vosk/models/vosk-model-small-cn-0.22.zip
unzip vosk-model-small-cn-0.22.zip
```

**大型模型（1.3GB）** - 更高精度
```bash
wget https://alphacephei.com/vosk/models/vosk-model-cn-0.22.zip
unzip vosk-model-cn-0.22.zip
```

#### 英文模型

**小型模型（40MB）**
```bash
wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
unzip vosk-model-small-en-us-0.15.zip
```

### 3. 目录结构

确保模型文件按以下结构放置：

```
public/
└── models/
    ├── vosk-model-small-cn-0.22/
    │   ├── am/
    │   ├── graph/
    │   ├── ivector/
    │   └── conf/
    └── vosk-model-small-en-us-0.15/
        ├── am/
        ├── graph/
        ├── ivector/
        └── conf/
```

### 4. 使用示例

#### 基础用法

```vue
<template>
  <div>
    <button @click="startListening" :disabled="!isInitialized">开始录音</button>
    <button @click="stopListening" :disabled="!isRecording">停止录音</button>
    <p>识别结果: {{ transcriptText }}</p>
  </div>
</template>

<script setup>
import { useVoskSpeechService } from '@/features/speechRecognition/hooks/useVoskSpeechService';

const {
  isInitialized,
  isRecording,
  transcriptText,
  startListening,
  stopListening
} = useVoskSpeechService({
  modelUrl: '/models/vosk-model-small-cn-0.22',
  sampleRate: 16000,
  language: 'zh-cn'
});
</script>
```

#### 高级配置

```typescript
import { useVoskSpeechService } from '@/features/speechRecognition/hooks/useVoskSpeechService';

const speechService = useVoskSpeechService({
  modelUrl: '/models/vosk-model-cn-0.22', // 使用大型模型
  sampleRate: 16000,                       // 采样率
  language: 'zh-cn'                        // 语言
});

// 监听事件
watchEffect(() => {
  if (speechService.transcriptText.value) {
    console.log('识别结果:', speechService.transcriptText.value);
  }
});
```

## API 参考

### VoskService 类

#### 构造函数

```typescript
new VoskService(config?: {
  modelUrl?: string;     // 模型文件路径
  sampleRate?: number;   // 采样率 (默认: 16000)
  language?: string;     // 语言代码 (默认: 'zh-cn')
})
```

#### 方法

- `initialize()`: 初始化服务
- `startRecognition()`: 开始语音识别
- `stopRecognition()`: 停止语音识别
- `getStatus()`: 获取服务状态
- `destroy()`: 清理资源

#### 事件

- `initialized`: 初始化完成
- `recognition-start`: 识别开始
- `recognition-result`: 识别结果
- `final-result`: 最终结果
- `recognition-end`: 识别结束
- `error`: 错误事件

### useVoskSpeechService Hook

#### 返回值

```typescript
{
  // 状态
  isInitialized: Ref<boolean>;     // 是否已初始化
  isRecording: Ref<boolean>;       // 是否正在录音
  error: Ref<string | null>;       // 错误信息
  transcriptText: Ref<string>;     // 最终识别文本
  interimText: Ref<string>;        // 临时识别文本
  confidence: Ref<number>;         // 置信度 (0-1)
  
  // 方法
  startListening: () => Promise<void>;  // 开始录音
  stopListening: () => void;            // 停止录音
  clearText: () => void;                // 清除文本
  getStatus: () => object | null;       // 获取状态
}
```

## 浏览器兼容性

### 支持的浏览器

- ✅ Chrome 66+
- ✅ Firefox 60+
- ✅ Safari 14+
- ✅ Edge 79+

### 必需的API

- Web Audio API
- MediaDevices.getUserMedia()
- WebAssembly (Vosk编译为WASM)

### 检查浏览器支持

```typescript
import { checkBrowserSupport } from '@/features/speechRecognition/config/speechConfig';

const support = checkBrowserSupport();
console.log('Web Audio API:', support.webAudioAPI);
console.log('MediaDevices:', support.mediaDevices);
```

## 故障排除

### 常见问题

#### 1. 模型加载失败

**错误**: `模型文件不存在: /models/vosk-model-small-cn-0.22`

**解决方案**:
- 确认模型文件已下载并正确放置在 `public/models/` 目录
- 检查模型文件路径是否正确
- 确认Web服务器可以访问模型文件

#### 2. 麦克风权限被拒绝

**错误**: `Permission denied`

**解决方案**:
- 确保在HTTPS环境下使用（Chrome要求HTTPS）
- 在浏览器设置中允许麦克风权限
- 检查操作系统的麦克风权限设置

#### 3. 初始化超时

**错误**: `Vosk初始化失败`

**解决方案**:
- 检查网络连接（如果使用CDN加载Vosk）
- 尝试使用本地Vosk库文件
- 减少模型大小（使用小型模型）

#### 4. 音频处理错误

**错误**: `处理音频数据时出错`

**解决方案**:
- 检查采样率设置是否正确
- 确认音频格式兼容性
- 尝试降低音频处理缓冲区大小

### 性能优化

#### 1. 模型选择

- **开发/测试**: 使用小型模型 (42MB)
- **生产环境**: 根据精度要求选择合适模型
- **移动端**: 优先使用小型模型

#### 2. 音频配置

```typescript
// 优化的音频配置
const audioConfig = {
  sampleRate: 16000,        // Vosk推荐采样率
  channelCount: 1,          // 单声道即可
  echoCancellation: true,   // 回声消除
  noiseSuppression: true,   // 噪音抑制
  autoGainControl: true     // 自动增益控制
};
```

#### 3. 内存管理

```typescript
// 及时清理资源
onUnmounted(() => {
  if (voskService.value) {
    voskService.value.destroy();
  }
});
```

## 高级用法

### 自定义音频处理

```typescript
// 扩展VoskService类
class CustomVoskService extends VoskService {
  private audioPreprocessor: AudioWorkletNode;
  
  protected override handleAudioData(data: Float32Array) {
    // 自定义音频预处理
    const processedData = this.preprocessAudio(data);
    super.handleAudioData(processedData);
  }
  
  private preprocessAudio(data: Float32Array): Float32Array {
    // 实现自定义的音频预处理逻辑
    // 例如: 降噪、音量标准化等
    return data;
  }
}
```

### 多语言切换

```typescript
const switchLanguage = async (language: 'zh-cn' | 'en-us') => {
  // 停止当前识别
  speechService.stopListening();
  
  // 销毁当前服务
  speechService.destroy();
  
  // 创建新的服务实例
  const newService = new VoskService({
    modelUrl: `/models/vosk-model-${language}`,
    language
  });
  
  await newService.initialize();
};
```

## 开发指南

### 添加新语言支持

1. 下载对应语言的Vosk模型
2. 更新 `speechConfig.ts` 中的模型配置
3. 添加语言选择UI组件
4. 测试语音识别效果

### 自定义事件处理

```typescript
// 扩展事件系统
voskService.addEventListener('custom-event', (data) => {
  console.log('自定义事件:', data);
});

// 在适当时机触发自定义事件
voskService.emit('custom-event', { custom: 'data' });
```

## 许可证

Vosk采用Apache 2.0许可证。详见：https://github.com/alphacep/vosk-api

## 相关链接

- [Vosk官方网站](https://alphacephei.com/vosk/)
- [Vosk GitHub](https://github.com/alphacep/vosk-api)
- [模型下载页面](https://alphacephei.com/vosk/models)
- [Kaldi语音识别工具包](https://kaldi-asr.org/) 