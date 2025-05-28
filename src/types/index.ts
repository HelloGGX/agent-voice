import { APP_CONFIG } from '@/config'

// 消息相关类型
export interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: number
  needsConfirmation?: boolean
}

// 语音设置类型
export interface VoiceSettings {
  wakeWordEnabled: boolean
  wakeWord: string
  noiseReduction: number[]
  volumeThreshold: number[]
  language: string
}

// 音频分析结果类型
export interface AudioAnalysisResult {
  volume: number
  frequency: number[]
  isAboveThreshold: boolean
}

// 应用状态类型
export interface AppState {
  isListening: boolean
  isRecording: boolean
  isProcessing: boolean
  wakeWordDetected: boolean
  currentRecognition: string
  connectionStatus: string
  statusType: 'success' | 'warning' | 'danger'
}

// SSE消息类型
export interface SSEMessage {
  type: 'message' | 'flight_info' | 'boarding_pass' | 'error' | 'status' | 'heartbeat'
  data: any
  timestamp: number
}

// 语音识别事件类型
export interface SpeechRecognitionResult {
  transcript: string
  confidence: number
  isRecorded?: boolean
}

// 航班信息类型
export interface FlightInfo {
  flightNumber: string
  destination: string
  departure: string
  gate: string
  seat: string
  status: string
  needsConfirmation?: boolean
  message?: string
}

// 登机牌信息类型
export interface BoardingPass {
  message: string
  barcode: string
  instructions: string
}

// 事件类型
export type SpeechServiceEvent = 
  | 'recognition-start'
  | 'recognition-result' 
  | 'final-result'
  | 'wake-word-detected'
  | 'recording-start'
  | 'recording-stop'
  | 'recognition-end'
  | 'recognition-error'
  | 'audio-data'
  | 'recording-complete'

export type SSEClientEvent =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'message'
  | 'flight_info_received'
  | 'boarding_pass_received'
  | 'max_reconnect_attempts'

// 导出配置常量
export { APP_CONFIG } 