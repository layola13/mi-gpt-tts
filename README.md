# MiGPT-TTS

[![npm version](https://badge.fury.io/js/mi-gpt-tts.svg)](https://www.npmjs.com/package/mi-gpt-tts) [![Docker Image Version](https://img.shields.io/docker/v/idootop/mi-gpt-tts?color=%23086DCD&label=docker%20image)](https://hub.docker.com/r/idootop/mi-gpt-tts)

适用于 [MiGPT](https://github.com/idootop/mi-gpt) 的 TTS 模块，支持火山引擎、微软必应、OpenAI 等 TTS 服务。

## ⚡️ 快速开始

> 如果你是在 MiGPT 中使用，请查看 [🔥 MiGPT 配置第三方 TTS 教程](https://github.com/idootop/mi-gpt-tts/blob/main/docs/mi-gpt.md)

首先，安装 `mi-gpt-tts` 依赖

```shell
npm install mi-gpt-tts
```

示例代码：

```typescript
import { createTTS, kTTSSpeakers } from "mi-gpt-tts";
import { writeFile } from "fs/promises";

const tts = createTTS({
  // 默认音色
  defaultSpeaker: process.env.TTS_DEFAULT_SPEAKER,
  // 火山引擎
  volcano: {
    appId: process.env.VOLCANO_TTS_APP_ID,
    accessToken: process.env.VOLCANO_TTS_ACCESS_TOKEN,
    userId: process.env.VOLCANO_TTS_USER_ID,
  },
  // 微软必应
  edge: {
    trustedToken: process.env.EDGE_TTS_TRUSTED_TOKEN,
  },
  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_TTS_MODEL,
    baseUrl: process.env.OPENAI_BASE_URL,
  },
});

async function main() {
  // 获取所有的音色列表
  console.log(kTTSSpeakers);

  // 语音合成
  const audioBuffer = await tts({
    text: "你好，很高兴认识你！",
    speaker: "云希", // 音色名称
  });
  if (audioBuffer) {
    await writeFile("output.mp3", audioBuffer);
  }
}

main();
```

## 🔊 音色列表

当前支持的完整音色列表和音色名称，可在以下列表中查询：

- [火山引擎](https://github.com/idootop/mi-gpt-tts/blob/main/src/tts/volcano.ts)
- [微软必应](https://github.com/idootop/mi-gpt-tts/blob/main/src/tts/edge.ts)
- [OpenAI](https://github.com/idootop/mi-gpt-tts/blob/main/src/tts/openai.ts)

> 注意：列表中不存在的音色，无法直接使用。请提 PR 或自行修改代码添加额外的音色。

## 📖 使用文档

以下为更详细的使用教程，大多数问题都可在 [💬 常见问题](https://github.com/idootop/mi-gpt-tts/blob/main/docs/faq.md) 中找到答案。

- [🔥 MiGPT 配置第三方 TTS 教程](https://github.com/idootop/mi-gpt-tts/blob/main/docs/mi-gpt.md)
- [⚙️ 参数设置](https://github.com/idootop/mi-gpt-tts/blob/main/docs/settings.md)
- [💬 常见问题](https://github.com/idootop/mi-gpt-tts/blob/main/docs/faq.md)
- [🚀 Benchmark](https://github.com/idootop/mi-gpt-tts/blob/main/docs/benchmark.md)
- [🛠️ 本地开发](https://github.com/idootop/mi-gpt-tts/blob/main/docs/development.md)
- [🔗 接口定义](https://github.com/idootop/mi-gpt-tts/blob/main/docs/api.md)
- [✨ 更新日志](https://github.com/idootop/mi-gpt-tts/blob/main/docs/changelog.md)

## License

[MIT](https://github.com/idootop/mi-gpt-tts/blob/main/LICENSE) License © 2024-PRESENT Del Wang

##新增 大模型语音合成 by layola13

```
const tts = createTTS({
  // Your config here...
  defaultSpeaker: "灿灿",
  volcano: {
    // ... volcano config
  }
});

// Example filter function to remove text in parentheses
const filterParentheses = (text) => {
  return text.replace(/\([^)]*\)/g, '');
};

// Example audio replacement config
const specialSoundPatterns = [
  {
    pattern: /\[([^\]]+)\]/g,  // Match content in square brackets
    getAudioPath: (matches) => {
      // Parse the content like [Ⅱ,Ⅲ,Ⅱ] and return file paths
      return matches[1].split(',').map(code => {
        switch(code.trim()) {
          case 'Ⅱ': return '2.mp3';
          case 'Ⅲ': return '3.mp3';
          default: return '1.mp3';
        }
      });
    }
  }
];

// Use TTS with the new features
await tts2({
  text: "（眼神变得更加暧昧，轻轻一笑）正常读出的文字 [Ⅱ,Ⅲ,Ⅱ] 继续正常读出的文字",
  speaker: "灿灿",
  textFilter: filterParentheses,
  audioReplacements: specialSoundPatterns,
  audioBasePath: '/path/to/audio/files'
});
```
