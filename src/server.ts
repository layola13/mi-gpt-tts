import express from "express";
import cors from "cors";
import { Readable } from "stream";
import { createTTS } from "./index.js";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Setup middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Initialize TTS
const tts = createTTS({
  defaultSpeaker: process.env.TTS_DEFAULT_SPEAKER || "灿灿",
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

// TTS streaming endpoint
app.post("/api/tts", async (req, res) => {
  const { text, speaker = "灿灿" } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    // Set headers for audio streaming
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Transfer-Encoding", "chunked");

    // Create readable stream for audio
    const audioStream = new Readable({
      read() {}, // Required but no-op
    });

    // Pipe the audio stream directly to the response
    audioStream.pipe(res);

    // Generate TTS with streaming
    await tts({
      text,
      speaker,
      stream: audioStream,
    });

    // Note: The stream will be closed by the TTS engine when done
  } catch (error) {
    console.error("TTS Error:", error);
    // If headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate speech" });
    } else {
      // If headers were sent, we just end the response
      res.end();
    }
  }
});

// Start server
app.listen(port, () => {
  console.log(`TTS Server running at http://localhost:${port}`);
});
