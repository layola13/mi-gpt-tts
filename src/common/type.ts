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

// customTextProcessor 类型定义
export interface CustomTextProcessorParams {
  text: string;
  outputStream: Readable;
  tts: (options: TTSOptions) => Promise<Uint8Array | null>;
  options: TTSOptions;
}

export interface TTSOptions extends TTSConfig {
  stream?: Readable;
  text?: string;
  speaker?: string;
  protocol?: "default" | "websocket";
  operation?: "submit" | "query";
  signal?: AbortSignal;
  textFilter?: (text: string) => string;

  // 完全自定义处理函数
  customTextProcessor?: (params: CustomTextProcessorParams) => Promise<void>;

  // 保持向后兼容的字段，但不再在库内部使用
  audioReplacements?: any;
  audioBasePath?: string;
}

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
