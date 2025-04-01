import { Readable } from "stream";
import { kTTSDefaultText } from "./common/const";
import { findTTSProvider } from "./common/speaker";
import { TTSConfig, TTSOptions, TTSProvider, TTSSpeaker } from "./common/type";
import { kEdgeTTS } from "./tts/edge";
import { kOpenAI } from "./tts/openai";
import { kVolcanoTTS, volcanoWebSocketTTS } from "./tts/volcano";

export type { TTSConfig, TTSOptions } from "./common/type";

/**
 * 此处注册 TTS 服务提供商
 */
export const kTTSProviders: TTSProvider[] = [
  kVolcanoTTS, // 火山引擎，官方文档：https://www.volcengine.com/docs/6561/79817
  kEdgeTTS, // 微软必应 Read Aloud，官方文档：https://www.microsoft.com/zh-cn/edge/features/read-aloud
  kOpenAI, // OpenAI TTS，官方文档：https://platform.openai.com/docs/guides/text-to-speech
];

export const kTTSSpeakers = kTTSProviders.reduce(
  (pre, s) => [...pre, ...s.speakers],
  [] as TTSSpeaker[]
);

export async function tts(options: TTSOptions) {
  const {
    text,
    speaker,
    stream,
    defaultSpeaker,
    protocol = "default", // Add protocol option with default value
    operation = "submit", // Add operation option like in Python demo
    ...rest
  } = options;

  // If using Python-compatible WebSocket protocol for Volcano
  if (protocol === "websocket" && rest.volcano) {
    return volcanoWebSocketTTS({
      ...rest,
      text: text || kTTSDefaultText,
      speaker: speaker || defaultSpeaker,
      stream: stream || new Readable({ read() {} }),
      operation, // Pass the operation parameter
    }).catch(() => null);
  }

  // Otherwise use the standard provider approach
  const provider = findTTSProvider(speaker, defaultSpeaker);
  return provider
    .tts({
      ...rest,
      speaker: provider.speaker,
      text: text || kTTSDefaultText,
      stream: stream || new Readable({ read() {} }),
    })
    .catch(() => null);
}

export function createTTS(config: TTSConfig) {
  return (options: TTSOptions) => tts({ ...config, ...options });
}
