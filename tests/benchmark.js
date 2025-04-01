import { createTTS, kTTSSpeakers } from "../src";
import { writeFile } from "fs/promises";
import dotenv from "dotenv";
dotenv.config();

const tts = createTTS({
  // 默认音色
  defaultSpeaker: process.env.TTS_DEFAULT_SPEAKER,
  // 火山引擎
  volcano: {
    appId: process.env.VOLCANO_TTS_APP_ID,
    accessToken: process.env.VOLCANO_TTS_ACCESS_TOKEN,
    userId: process.env.VOLCANO_TTS_USER_ID,
  },
});

async function main() {
  // 获取所有的音色列表
  console.log(kTTSSpeakers);

  // 语音合成
  const audioBuffer = await tts({
    text: "你好，很高兴认识你！",
    speaker: process.env.TTS_DEFAULT_SPEAKER,
  });
  if (audioBuffer) {
    await writeFile("output.mp3", audioBuffer);
  }
}

main();
