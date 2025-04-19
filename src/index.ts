import { Readable, PassThrough, Duplex } from "stream";
import { kTTSDefaultText } from "./common/const";
import { findTTSProvider } from "./common/speaker";
import { TTSConfig, TTSOptions, TTSProvider, TTSSpeaker } from "./common/type";
import { kEdgeTTS } from "./tts/edge";
import { kOpenAI } from "./tts/openai";
import { kVolcanoTTS, volcanoWebSocketTTS } from "./tts/volcano";
import { createReadStream, existsSync } from "fs";
import path from "path";

export type { TTSConfig, TTSOptions } from "./common/type";

/**
 * 此处注册 TTS 服务提供商
 */
export const kTTSProviders: TTSProvider[] = [
  kVolcanoTTS, // 火山引擎
  kEdgeTTS, // 微软必应 Read Aloud
  kOpenAI, // OpenAI TTS
];

export const kTTSSpeakers = kTTSProviders.reduce(
  (pre, s) => [...pre, ...s.speakers],
  [] as TTSSpeaker[]
);

// 基本的 TTS 函数，不包含音频替换逻辑
export async function tts(options: TTSOptions) {
  const {
    text,
    speaker,
    stream,
    defaultSpeaker,
    protocol = "default",
    operation = "submit",
    signal,
    ...rest
  } = options;

  // Create handlers for AbortSignal if provided
  if (signal) {
    if (signal.aborted) {
      console.log("TTS operation was aborted before it started");
      return null;
    }

    // Set up abort handler
    signal.addEventListener("abort", () => {
      console.log("TTS operation aborted");
    });
  }

  // If using Python-compatible WebSocket protocol for Volcano
  if (protocol === "websocket" && rest.volcano) {
    const { volcano } = rest;
    return volcanoWebSocketTTS({
      volcano,
      text: text || kTTSDefaultText,
      speaker: speaker || defaultSpeaker,
      stream: stream || new Readable({ read() {} }),
      operation,
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

// 导出简化版的 tts2 函数，只处理最基本的文本过滤
export async function tts2(options: TTSOptions) {
  let {
    text,
    speaker,
    stream,
    defaultSpeaker,
    protocol = "default",
    operation = "submit",
    signal,
    textFilter,
    customTextProcessor, // 新增：客户端可以提供一个完全自定义的处理函数
    ...rest
  } = options;

  // 创建输出流如果没有提供
  const outputStream = stream || new PassThrough();

  // 如果提供了自定义处理器，优先使用它
  if (text && customTextProcessor) {
    try {
      await customTextProcessor({
        text,
        outputStream,
        tts,
        options: { ...options, text: undefined, stream: undefined },
      });
      return null; // 自定义处理器已经处理了流
    } catch (error) {
      console.error("自定义处理器执行失败:", error);
      // 如果自定义处理器失败，继续后续处理
    }
  }
  // 否则只应用简单的文本过滤
  else if (text && textFilter && typeof textFilter === "function") {
    text = textFilter(text);
  }

  // 继续处理基本的 TTS 逻辑
  if (signal) {
    if (signal.aborted) {
      console.log("TTS operation was aborted before it started");
      return null;
    }

    signal.addEventListener("abort", () => {
      console.log("TTS operation aborted");
    });
  }

  if (protocol === "websocket" && rest.volcano) {
    const { volcano } = rest;
    return volcanoWebSocketTTS({
      volcano,
      text: text || kTTSDefaultText,
      speaker: speaker || defaultSpeaker,
      stream: outputStream,
      operation,
    }).catch(() => null);
  }

  const provider = findTTSProvider(speaker, defaultSpeaker);
  return provider
    .tts({
      ...rest,
      speaker: provider.speaker,
      text: text || kTTSDefaultText,
      stream: outputStream,
    })
    .catch(() => null);
}

export function createTTS2(config: TTSConfig) {
  return (options: TTSOptions) => tts2({ ...config, ...options });
}
