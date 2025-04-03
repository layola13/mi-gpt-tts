import { tts2 as tts2Function, createTTS } from "../src/index.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { Readable, PassThrough } from "stream";

// 加载环境变量
dotenv.config();

// 获取当前文件目录（ES modules）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建日志文件和函数
const logFile = path.join(__dirname, "tts-test.log");
function logToFile(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp}: ${message}\n`);
  console.log(message); // Also log to console
}

async function main() {
  // 清除旧日志
  if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
  }

  logToFile("开始 TTS 测试...");

  // 创建配置，但不使用 createTTS，因为它只包装了 tts 而不是 tts2
  const config = {
    defaultSpeaker: process.env.TTS_DEFAULT_SPEAKER,
    volcano: {
      appId: process.env.VOLCANO_TTS_APP_ID!,
      accessToken: process.env.VOLCANO_TTS_ACCESS_TOKEN!,
      userId: process.env.VOLCANO_TTS_USER_ID,
    },
  };

  // 检查音频文件
  const audioFiles = ["0.wav", "1.wav", "2.wav"];
  const audioDir = path.join(__dirname, "audio");

  // 确保音频目录存在
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
    logToFile(`创建了音频目录: ${audioDir}`);
  }

  // 检查并创建测试音频文件
  for (const file of audioFiles) {
    const filePath = path.join(audioDir, file);
    logToFile(
      `检查音频文件: ${filePath} - ${
        fs.existsSync(filePath) ? "存在" : "不存在"
      }`
    );

    if (!fs.existsSync(filePath)) {
      logToFile(`创建测试音频文件: ${filePath}`);
      const buffer = Buffer.alloc(1000);
      buffer.write("RIFF", 0);
      buffer.writeUInt32LE(buffer.length - 8, 4);
      buffer.write("WAVE", 8);
      fs.writeFileSync(filePath, buffer);
    }
  }

  try {
    logToFile("开始测试音频替换功能...");

    // 创建一个可写流来接收音频数据，同时记录日志
    const outputStream = new PassThrough();
    outputStream.on("data", (chunk) => {
      logToFile(`收到音频数据: ${chunk.length} 字节`);
    });
    outputStream.on("end", () => {
      logToFile(`音频流结束`);
    });

    // 直接调用 tts2 函数，不通过 createTTS 包装器
    const result = await tts2Function({
      ...config,
      text: "（眼神变得更加暧昧）正常文本 [Ⅱ,Ⅲ,Ⅱ] 继续正常文本",
      speaker: "灿灿",
      stream: outputStream,
      textFilter: (text) => {
        const filtered = text.replace(/\([^)]*\)/g, "");
        logToFile(`文本过滤: "${text}" -> "${filtered}"`);
        return filtered;
      },
      audioReplacements: [
        {
          pattern: /\[([^\]]+)\]/g,
          getAudioPath: (matches) => {
            const paths = matches[1].split(",").map((code) => {
              switch (code.trim()) {
                case "Ⅱ":
                  return "1.wav";
                case "Ⅲ":
                  return "2.wav";
                default:
                  return "0.wav";
              }
            });
            logToFile(
              `获取音频路径: ${matches[0]} -> ${JSON.stringify(paths)}`
            );
            return paths;
          },
        },
      ],
      audioBasePath: audioDir,
    });

    logToFile(
      `TTS 处理结果: ${result === null ? "流式处理完成" : "返回了缓冲区数据"}`
    );
  } catch (error) {
    logToFile(`测试失败: ${error}`);
    console.error("测试失败:", error);
  }

  logToFile("测试完成！检查日志文件获取详细处理过程: " + logFile);
}

// 执行测试
main().catch((error) => {
  console.error("主函数错误:", error);
  process.exit(1);
});
