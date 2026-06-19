import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.post("/api/chat", async (req, res) => {
    const { message, history, systemInstruction } = req.body;

    if (!process.env.OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY is missing");
      return res.status(500).json({ error: "OPENROUTER_API_KEY is not configured in the Secrets panel." });
    }

    const host = req.headers.host || "localhost:3000";
    const protocol = req.protocol || (host.includes("localhost") ? "http" : "https");
    const referer = process.env.APP_URL || `${protocol}://${host}`;

    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": referer,
        "X-Title": "RestoHost AI",
      }
    });

    try {
      const response = await openai.chat.completions.create({
        model: "openrouter/free",
        messages: [
          { role: "system", content: systemInstruction },
          ...(history || []),
          { role: "user", content: message },
        ],
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
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
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || "";
          
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
      console.error("OpenRouter API Error:", error);
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
