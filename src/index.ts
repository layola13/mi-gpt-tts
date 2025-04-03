import { Readable, PassThrough } from "stream";
import { kTTSDefaultText } from "./common/const";
import { findTTSProvider } from "./common/speaker";
import { TTSConfig, TTSOptions, TTSProvider, TTSSpeaker } from "./common/type";
import { kEdgeTTS } from "./tts/edge";
import { kOpenAI } from "./tts/openai";
import { kVolcanoTTS, volcanoWebSocketTTS } from "./tts/volcano";
import { createReadStream, existsSync } from "fs";
import { pipeline } from "stream/promises";

import path from "path";
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
    signal, // Get the AbortSignal
    textFilter,
    audioReplacements,
    audioBasePath = "./audio",
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
      // If you had references to WS connections, you could close them here
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
    audioReplacements,
    audioBasePath = "./audio",
    ...rest
  } = options;

  // Create the output stream if not provided
  const outputStream = stream || new PassThrough();

  // Apply text filter if provided
  if (text && textFilter && typeof textFilter === "function") {
    text = textFilter(text);
  }

  // Check for audio replacement patterns
  if (text && audioReplacements && audioReplacements.length > 0) {
    // Process the text and handle both TTS and audio file streaming
    await processTextWithReplacements(
      text,
      outputStream,
      audioReplacements,
      audioBasePath,
      { ...options, text: undefined, stream: undefined }
    );
    return null; // We've handled streaming already
  }

  // Continue with regular TTS processing
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

// Helper function to process text with replacements
async function processTextWithReplacements(
  text: string,
  outputStream: Readable,
  audioReplacements: TTSOptions["audioReplacements"],
  audioBasePath: string,
  ttsOptions: TTSOptions
) {
  // Split text into segments by audio replacement patterns
  const segments: {
    text: string;
    type: "text" | "audio";
    audioPaths?: string[];
  }[] = [];
  let currentText = "";
  let lastIndex = 0;

  // Find all matches of all patterns
  const allMatches: { match: RegExpExecArray; patternIndex: number }[] = [];

  audioReplacements!.forEach((replacement, patternIndex) => {
    let match;
    const regex = replacement.pattern;
    regex.lastIndex = 0; // Reset regex state

    while ((match = regex.exec(text)) !== null) {
      allMatches.push({ match, patternIndex });
    }
  });

  // Sort matches by their position in text
  allMatches.sort((a, b) => a.match.index - b.match.index);

  // Process text and matches
  for (const { match, patternIndex } of allMatches) {
    if (match.index > lastIndex) {
      // Add text segment before match
      segments.push({
        type: "text",
        text: text.substring(lastIndex, match.index),
      });
    }

    // Get audio paths for this match
    const audioPaths = audioReplacements![patternIndex].getAudioPath(match);

    segments.push({
      type: "audio",
      text: match[0], // Original matched text
      audioPaths,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      text: text.substring(lastIndex),
    });
  }

  // Process each segment
  for (const segment of segments) {
    if (segment.type === "text") {
      if (segment.text.trim()) {
        // Create a temporary stream for this text segment
        const tempStream = new PassThrough();

        // Start TTS for this segment
        await tts({
          ...ttsOptions,
          text: segment.text,
          stream: tempStream,
        });

        // Wait for this segment to finish
        await new Promise<void>((resolve) => {
          // Use pipeline instead of pipe for better error handling
          tempStream.on("data", (chunk) => outputStream.push(chunk));
          tempStream.on("end", () => resolve());
        });
      }
    } else if (segment.type === "audio") {
      for (const audioPath of segment.audioPaths!) {
        const fullPath = path.join(audioBasePath, audioPath);

        if (existsSync(fullPath)) {
          // Stream audio file to output
          const fileStream = createReadStream(fullPath);
          await new Promise<void>((resolve) => {
            fileStream.on("data", (chunk) => outputStream.push(chunk));
            fileStream.on("end", () => resolve());
          });
        } else {
          console.warn(`Audio file not found: ${fullPath}`);
        }
      }
    }
  }

  // End the stream
  outputStream.push(null);
}
