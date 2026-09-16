export type SystemState = "idle" | "listening" | "processing" | "offline";

export interface ChatAction {
  type: "open_url" | "open_app" | string;
  target?: string;
  url?: string;
  dest?: string;
  query?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  action?: ChatAction;
}

export interface TelemetryData {
  cpu: number;
  memory: number;
  neuralLoad: number;
  latency: number;
  fps: number;
  tokensPerSec: number;
  coreTemp: number;
}

export interface ProtocolItem {
  id: string;
  name: string;
  active: boolean;
  code: string;
}
