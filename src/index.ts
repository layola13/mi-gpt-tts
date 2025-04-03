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
export function createTTS2(config: TTSConfig) {
  return (options: TTSOptions) => tts2({ ...config, ...options });
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
// Helper function to process text with replacements
async function processTextWithReplacements(
  text: string,
  outputStream: Readable,
  audioReplacements: TTSOptions["audioReplacements"],
  audioBasePath: string,
  ttsOptions: TTSOptions
) {
  console.log("开始处理文本，应用音频替换...");

  // 定义统一格式的段落
  const segments: {
    text: string;
    type: "text" | "audio";
    audioPaths?: string[];
  }[] = [];

  // 处理两种可能的 audioReplacements 类型
  if (typeof audioReplacements === "function") {
    console.log("使用函数式音频替换...");
    try {
      const functionSegments = audioReplacements(text);

      // 转换函数返回的段落为统一格式
      functionSegments.forEach((segment) => {
        if (segment.type === "text") {
          segments.push({
            type: "text",
            text: segment.content as string,
          });
        } else if (segment.type === "audio") {
          segments.push({
            type: "audio",
            text: "",
            audioPaths: Array.isArray(segment.content)
              ? segment.content
              : [segment.content as string],
          });
        }
      });
    } catch (error) {
      console.error("音频替换函数执行失败:", error);
      throw new Error("音频替换处理失败");
    }
  } else if (Array.isArray(audioReplacements) && audioReplacements.length > 0) {
    console.log("使用模式数组音频替换...");
    let lastIndex = 0;
    const allMatches: { match: RegExpExecArray; patternIndex: number }[] = [];

    // 收集所有匹配
    audioReplacements.forEach((replacement, patternIndex) => {
      let match;
      const regex = replacement.pattern;
      regex.lastIndex = 0; // 重置正则状态

      while ((match = regex.exec(text)) !== null) {
        console.log(`找到匹配 #${allMatches.length + 1}:`, match[0]);
        allMatches.push({ match, patternIndex });
      }
    });

    console.log(`总共找到 ${allMatches.length} 个匹配项`);

    // 按文本位置排序
    allMatches.sort((a, b) => a.match.index - b.match.index);

    // 处理文本和匹配项
    for (const { match, patternIndex } of allMatches) {
      if (match.index > lastIndex) {
        // 添加匹配前的文本段
        const textSegment = text.substring(lastIndex, match.index);
        console.log(
          `添加文本段: "${textSegment.substring(0, 30)}${
            textSegment.length > 30 ? "..." : ""
          }"`
        );
        segments.push({
          type: "text",
          text: textSegment,
        });
      }

      // 获取此匹配的音频路径
      try {
        const audioPaths = audioReplacements[patternIndex].getAudioPath(match);
        console.log(`添加音频段 [${match[0]}] -> 音频文件:`, audioPaths);

        segments.push({
          type: "audio",
          text: match[0], // 原始匹配文本
          audioPaths,
        });
      } catch (error) {
        console.error(`处理音频路径失败: ${match[0]}`, error);
        // 如果获取音频路径失败，将原始文本作为文本段
        segments.push({
          type: "text",
          text: match[0],
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // 添加最后一个匹配后的剩余文本
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      console.log(
        `添加剩余文本: "${remainingText.substring(0, 30)}${
          remainingText.length > 30 ? "..." : ""
        }"`
      );
      segments.push({
        type: "text",
        text: remainingText,
      });
    }
  } else {
    console.warn("没有提供有效的音频替换配置，处理整个文本");
    segments.push({ type: "text", text });
  }

  console.log(`文本已分割成 ${segments.length} 个段落`);

  // 处理每个段落
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    console.log(`处理段落 ${i + 1}/${segments.length}: ${segment.type}`);

    try {
      if (segment.type === "text") {
        if (segment.text.trim()) {
          console.log(
            `生成语音文本: "${segment.text.trim().substring(0, 30)}${
              segment.text.trim().length > 30 ? "..." : ""
            }"`
          );

          // 创建临时流用于此文本段
          const tempStream = new PassThrough();

          // 为此段启动 TTS
          await tts({
            ...ttsOptions,
            text: segment.text,
            stream: tempStream,
          });

          // 等待此段完成
          let chunkCount = 0;
          let totalBytes = 0;

          await new Promise<void>((resolve, reject) => {
            tempStream.on("data", (chunk) => {
              chunkCount++;
              totalBytes += chunk.length;
              console.log(`TTS 语音数据 #${chunkCount}: ${chunk.length} 字节`);
              outputStream.push(chunk);
            });

            tempStream.on("end", () => {
              console.log(
                `TTS 段落 ${
                  i + 1
                } 完成，总计 ${chunkCount} 个分块，${totalBytes} 字节`
              );
              resolve();
            });

            tempStream.on("error", (err) => {
              console.error(`TTS 段落 ${i + 1} 失败:`, err);
              reject(err);
            });
          });
        } else {
          console.log("跳过空文本段");
        }
      } else if (segment.type === "audio") {
        if (!segment.audioPaths || segment.audioPaths.length === 0) {
          console.warn("段落类型为音频但没有提供文件路径，跳过");
          continue;
        }

        console.log(`处理 ${segment.audioPaths.length} 个音频文件`);

        for (let j = 0; j < segment.audioPaths.length; j++) {
          const audioPath = segment.audioPaths[j];
          const fullPath = path.join(audioBasePath, audioPath);
          console.log(
            `处理音频文件 ${j + 1}/${segment.audioPaths.length}: ${fullPath}`
          );

          if (existsSync(fullPath)) {
            console.log(`开始流式传输: ${audioPath}`);

            // 将音频文件流式传输到输出
            const fileStream = createReadStream(fullPath);
            let chunkCount = 0;
            let totalBytes = 0;

            await new Promise<void>((resolve, reject) => {
              fileStream.on("data", (chunk) => {
                chunkCount++;
                totalBytes += chunk.length;
                console.log(
                  `音频文件数据 #${chunkCount}: ${chunk.length} 字节`
                );
                outputStream.push(chunk);
              });

              fileStream.on("end", () => {
                console.log(
                  `音频文件 ${audioPath} 完成，总计 ${chunkCount} 个分块，${totalBytes} 字节`
                );
                resolve();
              });

              fileStream.on("error", (err) => {
                console.error(`音频文件 ${audioPath} 处理失败:`, err);
                reject(err);
              });
            });
          } else {
            console.warn(`音频文件未找到: ${fullPath}`);
          }
        }
      }
    } catch (error) {
      console.error(`段落 ${i + 1} 处理失败:`, error);
      // 继续处理其他段落而不是完全失败
      continue;
    }
  }

  console.log("所有段落处理完成，关闭流");
  // 结束流
  outputStream.push(null);
}
