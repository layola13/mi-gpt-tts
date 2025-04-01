import { writeFile } from "fs/promises";
import { benchmark, benchmarkWebSocket } from "./benchmark.js";

async function main() {
  // // Test regular TTS implementation
  // console.log("🔄 Running standard TTS benchmark...");
  // const audioBuffer = await benchmark({
  //   times: 1,
  //   speaker: "灿灿",
  // });

  // if (audioBuffer) {
  //   await writeFile("test_standard.mp3", audioBuffer);
  //   console.log("✅ Standard TTS audio saved to test_standard.mp3");
  // }

  // Test WebSocket TTS implementation
  console.log("\n🔄 Running WebSocket TTS benchmark...");
  const wsAudioBuffer = await benchmarkWebSocket({
    times: 1,
    speaker: "ICL_zh_female_bingjiaojiejie_tob",
    operation: "submit", // Can be "submit" or "query"
  });

  if (wsAudioBuffer) {
    await writeFile("test_websocket.mp3", wsAudioBuffer);
    console.log("✅ WebSocket TTS audio saved to test_websocket.mp3");
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
