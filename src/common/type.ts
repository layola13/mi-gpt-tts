import { Readable } from "stream";

export interface VolcanoConfig {
  appId: string;
  accessToken: string;
  userId?: string;
}

export interface EdgeConfig {
  trustedToken: string;
}

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface TTSConfig {
  /**
   * 默认音色
   *
   * 当指定的音色不存在时，会 fallback 到默认音色
   */
  defaultSpeaker?: string;
  volcano?: VolcanoConfig;
  edge?: EdgeConfig;
  openai?: OpenAIConfig;
}

export type TTSBuilder = (
  options: TTSConfig & {
    stream?: Readable;
    text: string;
    speaker: string;
  }
) => Promise<Uint8Array | null>;

export type TTSOptions = TTSConfig & {
  stream?: Readable;
  text?: string;
  speaker?: string;
  protocol?: "default" | "websocket"; // Add protocol option
  operation?: "submit" | "query"; // Add operation option
  signal?: AbortSignal; // Add AbortSignal for cancellation
  // New options
  textFilter?: (text: string) => string; // Text processing function
  audioReplacements?: {
    pattern: RegExp; // Pattern to match in text
    getAudioPath: (matches: string[]) => string[]; // Function to get audio file paths
  }[];
  audioBasePath?: string; // Base path for audio files
};

export interface TTSSpeaker {
  /**
   * 音色名称
   */
  name?: string;
  /**
   * 音色性别分类，男女（可选）
   */
  gender?: string;
  /**
   * 音色标识
   */
  speaker: string;
}

export interface TTSProvider {
  name: string;
  speakers: TTSSpeaker[];
  tts: TTSBuilder;
}

export interface CurrentTTSSpeaker {
  speaker: string;
  tts: TTSBuilder;
}
