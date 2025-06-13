import { Journey } from './components/tempComponents/JourneyCard.vue';

export type SpeechEventType = 'journey' | 'human_message' | 'ai_message';

export interface EventData {
  event: SpeechEventType;
  data: {
    state: EventState;
    content: string | Record<string, any> | Journey[];
  };
}

export enum EventState {
  START = 'start',
  END = 'end',
  PROCESSING = 'processing',
}
