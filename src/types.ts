export type SpeechEventType = "journey" | "human_message" | "ai_message";

export interface Message {
  type: string;
  data: {
    event: SpeechEventType;
    data: string | Record<string, any> | any[];
  };
}
