import { generateSystemPrompt } from "./utils";
import { RestaurantConfig } from "./types";

export class AIService {
  private systemInstruction: string;

  constructor(config: RestaurantConfig) {
    this.systemInstruction = generateSystemPrompt(config);
  }

  async sendMessageStream(message: string, history: { role: string; text: string }[], onChunk: (chunk: string) => void, signal?: AbortSignal) {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal,
        body: JSON.stringify({
          message,
          history: history.map(h => ({ 
            role: h.role === "user" ? "user" : "assistant", 
            content: h.text 
          })),
          systemInstruction: this.systemInstruction,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "API request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      let lineIndex;
      while ((lineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, lineIndex).trim();
        buffer = buffer.slice(lineIndex + 1);

        if (line.startsWith("data:")) {
          const data = line.slice(5).trim();
          
          if (data === "[DONE]") {
            // Processing finished
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              const msg = typeof parsed.error === 'string' ? parsed.error : (parsed.error.message || JSON.stringify(parsed.error));
              onChunk(`\n\n[Connection Issue: ${msg}]`);
              return;
            }
            if (parsed.text !== undefined) {
              onChunk(parsed.text);
            }
          } catch (e) {
            // Heartbeats or partial data - usually handled by buffer split but safety first
            if (data && data !== ":" && !data.includes("keepalive") && !data.includes("heartbeat")) {
              const match = data.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
              if (match && match[1]) {
                try {
                  onChunk(JSON.parse(`"${match[1]}"`));
                } catch (innerE) { /* skip */ }
              }
            }
          }
        }
      }
    }
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw error;
      }
      console.error("AI Service Error:", error);
      let msg = "It looks like I'm having trouble connecting to my brain right now. 🧠 Just a moment, perhaps try again?";
      
      if (error.message.includes("GEMINI_API_KEY")) {
        msg = "The Gemini API key seems to be missing. Please add it to the Secrets panel to activate my thinking!";
      } else if (error.message.includes("429") || error.message.includes("Rate limit")) {
        msg = "I've been talking a bit too much and reached a limit (Error 429). Could you wait a few seconds and try again?";
      } else if (error.message.includes("Provider error")) {
        msg = "My underlying AI provider is having a momentary hiccup. Trying again in a few seconds usually works!";
      }
      
      onChunk(`\n\n[${msg}]`);
    } finally {
      // Ensure we don't leave things hanging
    }
  }
}
