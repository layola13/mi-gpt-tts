import { createTTS } from "../src/index.js";
import { Readable } from "stream";
import { createWriteStream } from "fs";
import dotenv from "dotenv";

dotenv.config();

const tts = createTTS({
  defaultSpeaker: process.env.TTS_DEFAULT_SPEAKER,
  volcano: {
    appId: process.env.VOLCANO_TTS_APP_ID!,
    accessToken: process.env.VOLCANO_TTS_ACCESS_TOKEN!,
    userId: process.env.VOLCANO_TTS_USER_ID,
  },
  edge: {
    trustedToken: process.env.EDGE_TTS_TRUSTED_TOKEN!,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: process.env.OPENAI_TTS_MODEL,
    baseUrl: process.env.OPENAI_BASE_URL,
  },
});

/**
 * Standard benchmark using the default TTS implementation
 */
export async function benchmark(options?: {
  speaker?: string;
  times?: number;
  textLength?: number;
}) {
  let result;
  const { speaker = "灿灿", times = 10, textLength = 124 } = options ?? {};
  const text = generateText(textLength);
  const final = await withTimeUsage(async () => {
    for (let i = 0; i < times; i++) {
      const res = await withTimeUsage(() => tts({ text, speaker }));
      if (res.data) {
        result = res.data;
        console.log(
          `🔥 ${speaker} ${i + 1} 用时：${(res.time / 1000).toFixed(2)}s`
        );
      } else {
        console.log(
          `❌ ${speaker} ${i + 1} 用时：${(res.time / 1000).toFixed(2)}s`
        );
      }
    }
    return result;
  });
  const total = (final.time / 1000).toFixed(2);
  const average = (final.time / 1000 / times).toFixed(2);
  console.log(`✅ ${speaker} 总用时：${total}s 平均用时：${average}s`);
  return result;
}

/**
 * WebSocket-based benchmark that uses the volcanoWebSocketTTS implementation
 */
export async function benchmarkWebSocket(options?: {
  speaker?: string;
  times?: number;
  textLength?: number;
  operation?: "submit" | "query";
}) {
  const {
    speaker = "灿灿",
    times = 1,
    textLength = 124,
    operation = "submit",
  } = options ?? {};

  const text = generateText(textLength);
  const outputFile = `test_websocket_${speaker}.mp3`;

  console.log(`🔄 WebSocket TTS Benchmark: ${speaker}`);
  console.log(`🔄 Operation: ${operation}`);

  const finalResult = await withTimeUsage(async () => {
    const promises = [];

    for (let i = 0; i < times; i++) {
      promises.push(
        withTimeUsage(async () => {
          // Create a readable stream that will be fed audio chunks
          const audioStream = new Readable({
            read() {}, // This is required but we don't need to implement it
          });

          // Create file stream for each test iteration
          const fileStream = createWriteStream(`${i + 1}_${outputFile}`);
          audioStream.pipe(fileStream);

          // Start WebSocket TTS with streaming
          const result = await tts({
            text,
            speaker,
            stream: audioStream,
            protocol: "websocket", // Use the WebSocket protocol
            operation,
          });

          return new Promise<Buffer | null>((resolve) => {
            fileStream.on("finish", () => {
              resolve(result);
            });
          });
        }).then((res) => {
          if (res.data) {
            console.log(
              `🔥 WebSocket ${speaker} ${i + 1} 用时：${(
                res.time / 1000
              ).toFixed(2)}s`
            );
            return res.data;
          } else {
            console.log(
              `❌ WebSocket ${speaker} ${i + 1} 用时：${(
                res.time / 1000
              ).toFixed(2)}s`
            );
            return null;
          }
        })
      );
    }

    // Run tests in sequence to avoid overwhelming the API
    let result = null;
    for (const promise of promises) {
      const data = await promise;
      if (data) {
        result = data;
      }
    }

    return result;
  });

  console.log(
    `✅ WebSocket ${speaker} 总用时：${(finalResult.time / 1000).toFixed(2)}s`
  );
  return finalResult.data;
}

/**
 * 计算耗时，单位：毫秒
 */
async function withTimeUsage<T = any>(task: () => Promise<T>) {
  const start: any = new Date();
  const data = await task();
  const end: any = new Date();
  return { data, time: end - start };
}

/**
 * 生成指定长度的文本
 *
 * 文字内容节选自路遥的《平凡的世界》第一自然段。
 */
function generateText(len = 124) {
  let text =
    "一九七五年，二三月间，一个平平常常的日子，细蒙蒙的雨丝夹着一星半点的雪花，正纷纷淋淋地向大地飘洒着。时令已快到惊蛰，雪当然再不会存留，往往还没等落地，就已经消失得无踪无影了。黄土高原严寒而漫长的冬天看来就要过去，但那真正温暖的春天还远远地没有到来。";
  while (text.length < len) {
    text += text;
  }
  return text.substring(0, len);
}
