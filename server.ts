import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.post("/api/chat", async (req, res) => {
    const { message, history, systemInstruction } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is missing");
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured. Please add it to the Secrets panel in key settings to activate my thinking!" });
    }

    try {
      const contents = [];
      if (history && Array.isArray(history)) {
        for (const msg of history) {
          contents.push({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content || "" }]
          });
        }
      }
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx buffering

      // Send a heartbeat every 10 seconds to keep the connection alive
      const heartbeatInterval = setInterval(() => {
        if (!res.writableEnded) {
          res.write(": heartbeat\n\n");
          if ((res as any).flush) (res as any).flush();
        }
      }, 10000);

      try {
        for await (const chunk of responseStream) {
          const content = chunk.text || "";
          
          if (content) {
            res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
            if ((res as any).flush) {
              (res as any).flush();
            }
          }
        }
        res.write("data: [DONE]\n\n");
      } finally {
        clearInterval(heartbeatInterval);
      }
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      const errorMessage = error.message || "Failed to fetch response from AI";
      if (!res.headersSent) {
        res.status(500).json({ error: errorMessage });
      } else {
        res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      }
    } finally {
      res.end();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
