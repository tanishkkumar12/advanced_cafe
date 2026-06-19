import OpenAI from "openai";

export const config = {
  runtime: "edge",
};

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { message, history, systemInstruction } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY is not configured in Vercel." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const host = req.headers.get("host") || "vercel.com";
    const protocol = host.includes("localhost") ? "http" : "https";
    const referer = process.env.APP_URL || `${protocol}://${host}`;

    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
      defaultHeaders: {
        "HTTP-Referer": referer,
        "X-Title": "RestoHost AI",
      },
    });

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

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Heartbeat to keep connection alive
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch (e) { /* ignore if already closed */ }
        }, 10000);

        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || "";
            
            if (content) {
              const data = JSON.stringify({ text: content });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          // Signal stream completion explicitly
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err: any) {
          console.error("Stream Error:", err);
          const errorMsg = JSON.stringify({ error: err.message || "Streaming interrupted" });
          controller.enqueue(encoder.encode(`data: ${errorMsg}\n\n`));
        } finally {
          clearInterval(heartbeat);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    console.error("OpenRouter API Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
