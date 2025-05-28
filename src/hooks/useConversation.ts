import { createGlobalState, useLocalStorage } from '@vueuse/core'

// 使用自动同步的 storage
const STORAGE_KEY = 'voice_assistant_history'

export const useConversation = createGlobalState(() => useLocalStorage<null | string>(STORAGE_KEY, null));
