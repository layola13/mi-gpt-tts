import { randomUUID } from "crypto";
import WebSocket from "ws";
import * as zlib from "zlib";
import { createStreamHandler } from "../common/stream";
import {
  TTSBuilder,
  TTSProvider,
  TTSSpeaker,
  VolcanoConfig,
} from "../common/type";

// 火山引擎 TTS 音色列表：https://www.volcengine.com/docs/6561/97465
const kVolcanoTTSSpeakers: TTSSpeaker[] = [
  /**
   * 通用场景
   */
  {
    name: "灿灿",
    gender: "女",
    speaker: "BV700_streaming",
  },
  {
    name: "病娇姐姐",
    gender: "女",
    speaker: "ICL_zh_female_bingjiaojiejie_tob",
  },
  {
    name: "灿灿二",
    gender: "女",
    speaker: "BV700_V2_streaming",
  },
  {
    name: "梓梓",
    gender: "女",
    speaker: "BV406_streaming",
  },
  {
    name: "梓梓二",
    gender: "女",
    speaker: "BV406_V2_streaming",
  },
  {
    name: "燃燃",
    gender: "女",
    speaker: "BV407_streaming",
  },
  {
    name: "燃燃二",
    gender: "女",
    speaker: "BV407_V2_streaming",
  },
  {
    name: "炀炀",
    gender: "女",
    speaker: "BV705_streaming",
  },
  {
    name: "擎苍",
    gender: "女",
    speaker: "BV701_streaming",
  },
  {
    name: "擎苍二",
    gender: "女",
    speaker: "BV701_V2_streaming",
  },
  {
    name: "通用女声",
    gender: "女",
    speaker: "BV001_streaming",
  },
  {
    name: "通用女声二",
    gender: "女",
    speaker: "BV001_V2_streaming",
  },
  {
    name: "通用男声",
    gender: "男",
    speaker: "BV002_streaming",
  },
  /**
   * 有声阅读
   */
  {
    name: "阳光青年",
    gender: "男",
    speaker: "BV123_streaming",
  },
  {
    name: "反卷青年",
    gender: "男",
    speaker: "BV120_streaming",
  },
  {
    name: "通用赘婿",
    gender: "男",
    speaker: "BV119_streaming",
  },
  {
    name: "古风少御",
    gender: "女",
    speaker: "BV115_streaming",
  },
  {
    name: "霸气青叔",
    gender: "男",
    speaker: "BV107_streaming",
  },
  {
    name: "质朴青年",
    gender: "男",
    speaker: "BV100_streaming",
  },
  {
    name: "温柔淑女",
    gender: "女",
    speaker: "BV104_streaming",
  },
  {
    name: "开朗青年",
    gender: "男",
    speaker: "BV004_streaming",
  },
  {
    name: "甜宠少御",
    gender: "女",
    speaker: "BV113_streaming",
  },
  {
    name: "儒雅青年",
    gender: "男",
    speaker: "BV102_streaming",
  },
  /**
   * 智能助手
   */
  {
    name: "甜美小源",
    gender: "女",
    speaker: "BV405_streaming",
  },
  {
    name: "亲切女声",
    gender: "女",
    speaker: "BV007_streaming",
  },
  {
    name: "知性女声",
    gender: "女",
    speaker: "BV009_streaming",
  },
  {
    name: "诚诚",
    gender: "女",
    speaker: "BV419_streaming",
  },
  {
    name: "童童",
    gender: "女",
    speaker: "BV415_streaming",
  },
  {
    name: "亲切男声",
    gender: "男",
    speaker: "BV008_streaming",
  },
  /**
   * 视频配音
   */
  {
    name: "译制片男声",
    gender: "男",
    speaker: "BV408_streaming",
  },
  {
    name: "懒小羊",
    gender: "男",
    speaker: "BV426_streaming",
  },
  {
    name: "清新文艺女声",
    gender: "女",
    speaker: "BV428_streaming",
  },
  {
    name: "鸡汤女声",
    gender: "女",
    speaker: "BV403_streaming",
  },
  {
    name: "智慧老者",
    gender: "男",
    speaker: "BV158_streaming",
  },
  {
    name: "慈爱姥姥",
    gender: "女",
    speaker: "BV157_streaming",
  },
  {
    name: "说唱小哥",
    gender: "男",
    speaker: "BR001_streaming",
  },
  {
    name: "活力解说男",
    gender: "男",
    speaker: "BV410_streaming",
  },
  {
    name: "小帅",
    gender: "男",
    speaker: "BV411_streaming",
  },
  {
    name: "小帅多情感",
    gender: "男",
    speaker: "BV437_streaming",
  },
  {
    name: "小美",
    gender: "女",
    speaker: "BV412_streaming",
  },
  {
    name: "纨绔青年",
    gender: "男",
    speaker: "BV159_streaming",
  },
  {
    name: "直播一姐",
    gender: "男",
    speaker: "BV418_streaming",
  },
  {
    name: "反卷青年",
    gender: "男",
    speaker: "BV120_streaming",
  },
  {
    name: "沉稳解说男",
    gender: "男",
    speaker: "BV142_streaming",
  },
  {
    name: "潇洒青年",
    gender: "男",
    speaker: "BV143_streaming",
  },
  {
    name: "阳光男声",
    gender: "男",
    speaker: "BV056_streaming",
  },
  {
    name: "活泼女声",
    gender: "女",
    speaker: "BV005_streaming",
  },
  {
    name: "小萝莉",
    gender: "女",
    speaker: "BV064_streaming",
  },
  /**
   * 特色音色
   */
  {
    name: "奶气萌娃",
    gender: "男",
    speaker: "BV051_streaming",
  },
  {
    name: "动漫海绵",
    gender: "男",
    speaker: "BV063_streaming",
  },
  {
    name: "动漫海星",
    gender: "男",
    speaker: "BV417_streaming",
  },
  {
    name: "动漫小新",
    gender: "男",
    speaker: "BV050_streaming",
  },
  {
    name: "天才童声",
    gender: "男",
    speaker: "BV061_streaming",
  },
  /**
   * 广告配音
   */
  {
    name: "促销男声",
    gender: "男",
    speaker: "BV401_streaming",
  },
  {
    name: "促销女声",
    gender: "女",
    speaker: "BV402_streaming",
  },
  {
    name: "磁性男声",
    gender: "男",
    speaker: "BV006_streaming",
  },
  /**
   * 新闻播报
   */
  {
    name: "新闻女声",
    gender: "女",
    speaker: "BV011_streaming",
  },
  {
    name: "新闻男声",
    gender: "男",
    speaker: "BV012_streaming",
  },
  /**
   * 教育场景
   */
  {
    name: "知性姐姐",
    gender: "女",
    speaker: "BV034_streaming",
  },
  {
    name: "温柔小哥",
    gender: "男",
    speaker: "BV033_streaming",
  },
  /**
   * 方言
   */
  {
    name: "东北老铁",
    gender: "男",
    speaker: "BV021_streaming",
  },
  {
    name: "东北丫头",
    gender: "女",
    speaker: "BV020_streaming",
  },
  {
    name: "方言灿灿",
    gender: "女",
    speaker: "BV704_streaming",
  },
  {
    name: "佟掌柜",
    gender: "女",
    speaker: "BV210_streaming",
  },
  {
    name: "沪上阿姨",
    gender: "女",
    speaker: "BV217_streaming",
  },
  {
    name: "广西老表",
    gender: "男",
    speaker: "BV213_streaming",
  },
  {
    name: "甜美台妹",
    gender: "女",
    speaker: "BV025_streaming",
  },
  {
    name: "台普男声",
    gender: "男",
    speaker: "BV227_streaming",
  },
  {
    name: "港剧男神",
    gender: "男",
    speaker: "BV026_streaming",
  },
  {
    name: "广东话",
    gender: "女",
    speaker: "BV424_streaming",
  },
  {
    name: "天津话",
    gender: "男",
    speaker: "BV212_streaming",
  },
  {
    name: "郑州话",
    gender: "男",
    speaker: "BV214_streaming",
  },
  {
    name: "重庆话",
    gender: "男",
    speaker: "BV019_streaming",
  },
  {
    name: "四川话",
    gender: "女",
    speaker: "BV221_streaming",
  },
  {
    name: "重庆话",
    gender: "女",
    speaker: "BV423_streaming",
  },
  {
    name: "湖南话",
    gender: "女",
    speaker: "BV226_streaming",
  },
  {
    name: "长沙话",
    gender: "女",
    speaker: "BV216_streaming",
  },
];

const kAPI = "wss://openspeech.bytedance.com/api/v1/tts/ws_binary";
const kDefaultHeader: Buffer = Buffer.from([0x11, 0x10, 0x11, 0x00]);

export const volcanoTTS: TTSBuilder = async ({
  volcano,
  text,
  speaker,
  stream: responseStream,
}) => {
  const request: any = getVolcanoConfig(volcano);
  if (!request) {
    return null; // 找不到火山引擎 TTS 环境变量
  }

  let requestId: string = randomUUID();
  request.request.text = text;
  request.request.reqid = requestId;
  request.audio.voice_type = speaker;
  requestId = requestId.substring(0, 8);

  const payloadLength = Buffer.alloc(4, 0);
  let payloadBytes = Buffer.from(JSON.stringify(request));
  payloadBytes = zlib.gzipSync(payloadBytes);
  payloadLength.writeUInt32BE(payloadBytes.length, 0);
  const fullClientRequest = Buffer.concat([
    kDefaultHeader,
    payloadLength,
    payloadBytes,
  ]);

  const streamHandler = createStreamHandler(responseStream);

  try {
    const ws = new WebSocket(kAPI, {
      headers: { Authorization: `Bearer; ${request.app.token}` },
    });

    ws.on("message", (data) => {
      const responseBuffer = Buffer.from(data as ArrayBuffer);
      const messageSpecificFlags = responseBuffer[1] & 0x0f;
      const audioData = parseAudioData(streamHandler, responseBuffer);
      if (!audioData || audioData === "started") {
        return;
      }
      if (audioData.length > 0) {
        streamHandler.push(audioData);
        if (messageSpecificFlags === 3) {
          ws.close();
        }
      }
    });

    ws.on("error", (err) => {
      streamHandler.error(err, "Volcano | WebSocket error");
    });

    ws.on("close", () => {
      streamHandler.end();
    });

    ws.on("open", () => {
      ws.send(fullClientRequest);
    });
  } catch (err) {
    streamHandler.error(err, "Volcano | Unknown error");
  }

  return streamHandler.result;
};

function parseAudioData(
  streamHandler: ReturnType<typeof createStreamHandler>,
  responseBuffer: Buffer
) {
  const headerSize = responseBuffer[0] & 0x0f;
  const messageType = responseBuffer[1] >> 4;
  const messageSpecificFlags = responseBuffer[1] & 0x0f;
  const messageCompression = responseBuffer[2] & 0x0f;
  const payload = responseBuffer.subarray(headerSize * 4);

  if (messageType === 0xb) {
    // 接收音频数据
    if (messageSpecificFlags === 0) {
      return "started";
    } else {
      return payload.subarray(8);
    }
  } else if (messageType === 0xf) {
    // 出错了
    const errorCode = payload.readInt32BE(0);
    let errorMessage = payload.subarray(8);
    if (messageCompression === 1) {
      errorMessage = zlib.gunzipSync(errorMessage);
    }
    streamHandler.error(
      String(errorMessage),
      `Volcano | Error code: ${errorCode}`
    );
  } else {
    streamHandler.error("Unknown", `Message`);
  }
}

const getVolcanoConfig = (volcano?: VolcanoConfig) => {
  const appid = volcano?.appId;
  const token = volcano?.accessToken;
  const uid = volcano?.userId ?? "666";
  if (!appid || !token) {
    console.log(
      "❌ 找不到火山引擎 TTS 环境变量：VOLCANO_TTS_APP_ID、VOLCANO_TTS_ACCESS_TOKEN"
    );
    return;
  }
  return {
    app: {
      appid,
      token,
      cluster: "volcano_tts",
    },
    user: {
      uid,
    },
    audio: {
      encoding: "mp3",
    },
    request: {
      text_type: "plain",
      operation: "submit",
    },
  };
};

export const kVolcanoTTS: TTSProvider = {
  name: "火山引擎 TTS",
  tts: volcanoTTS,
  speakers: kVolcanoTTSSpeakers,
};

function parseAudioData_bigModel(
  streamHandler: ReturnType<typeof createStreamHandler>,
  responseBuffer: Buffer
) {
  const headerSize = responseBuffer[0] & 0x0f;
  const messageType = responseBuffer[1] >> 4;
  const messageSpecificFlags = responseBuffer[1] & 0x0f;
  const messageCompression = responseBuffer[2] & 0x0f;
  const payload = responseBuffer.subarray(headerSize * 4);

  if (messageType === 0xb) {
    // 接收音频数据
    if (messageSpecificFlags === 0) {
      console.log("Server ACK received (no sequence number)");
      return "started";
    } else {
      // Extract sequence number and payload size as in Python
      const sequenceNumber = payload.readInt32BE(0); // Signed int
      const payloadSize = payload.readUInt32BE(4); // Unsigned int
      const audioData = payload.subarray(8); // Skip first 8 bytes

      console.log(
        `Sequence number: ${sequenceNumber}, Payload size: ${payloadSize}`
      );

      // Return the actual audio data and metadata
      return {
        audio: audioData,
        isDone: sequenceNumber < 0,
        sequenceNumber,
      };
    }
  } else if (messageType === 0xf) {
    // Error handling...
    const errorCode = payload.readInt32BE(0);
    let errorMessage = payload.subarray(8);
    if (messageCompression === 1) {
      errorMessage = zlib.gunzipSync(errorMessage);
    }
    streamHandler.error(
      String(errorMessage),
      `Volcano | Error code: ${errorCode}`
    );
    return null;
  } else {
    streamHandler.error("Unknown", `Message type: ${messageType}`);
    return null;
  }
}

// Export the WebSocket implementation separately
export async function volcanoWebSocketTTS({
  volcano,
  text,
  speaker,
  stream: responseStream,
  operation = "submit",
}) {
  const request: any = getVolcanoConfig(volcano);
  if (!request) {
    return null; // 找不到火山引擎 TTS 环境变量
  }

  let requestId: string = randomUUID();
  request.request.text = text;
  request.request.reqid = requestId;
  request.audio.voice_type = speaker; // Use voice_type instead of speaker to match Python demo
  request.request.operation = operation; // Use operation from parameters
  requestId = requestId.substring(0, 8);

  // Use the exact same header format as in Python demo
  const defaultHeader = Buffer.from([0x11, 0x10, 0x11, 0x00]);

  // Prepare payload
  let payloadBytes = Buffer.from(JSON.stringify(request));
  payloadBytes = zlib.gzipSync(payloadBytes);

  // Create payload length buffer (4 bytes, big endian)
  const payloadLength = Buffer.alloc(4);
  payloadLength.writeUInt32BE(payloadBytes.length, 0);

  // Combine headers and payload
  const fullClientRequest = Buffer.concat([
    defaultHeader,
    payloadLength,
    payloadBytes,
  ]);

  const streamHandler = createStreamHandler(responseStream);

  try {
    const ws = new WebSocket(kAPI, {
      headers: { Authorization: `Bearer; ${request.app.token}` },
    });

    // Handle WebSocket events similar to Python implementation
    ws.on("message", (data) => {
      const responseBuffer = Buffer.from(data as ArrayBuffer);
      const audioResult = parseAudioData_bigModel(
        streamHandler,
        responseBuffer
      );

      if (!audioResult) {
        return; // Error already handled
      }

      if (audioResult === "started") {
        console.log("TTS started, waiting for audio data...");
        return;
      }

      // Process the audio data
      if (audioResult.audio.length > 0) {
        streamHandler.push(audioResult.audio);

        // If this is the last message (sequence < 0), close the connection
        if (audioResult.isDone) {
          console.log("Final audio chunk received, closing connection");
          ws.close();
        }
      }
    });

    ws.on("error", (err) => {
      streamHandler.error(err, "Volcano WebSocket | Error");
    });

    ws.on("close", () => {
      streamHandler.end();
    });

    ws.on("open", () => {
      ws.send(fullClientRequest);
    });
  } catch (err) {
    streamHandler.error(err, "Volcano WebSocket | Unknown error");
  }

  return streamHandler.result;
}
