export const config = {
  api: {
    bodyParser:  { sizeLimit: '4mb' },
    maxDuration: 30,
  },
};

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "https://vlad-on-git.github.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { system, messages } = req.body;

    const openaiMessages = [];
    if (system) openaiMessages.push({ role: "system", content: system });
    for (const msg of messages) openaiMessages.push({ role: msg.role, content: msg.content });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer":  "https://vlad-on-git.github.io/DND/",
        "X-Title":       "Khranitel Svitkov",
      },
      body: JSON.stringify({
        // Лучшие бесплатные модели на OpenRouter — fallback если первая занята
        models: [
          "meta-llama/llama-3.3-70b-instruct:free",   // GPT-4 уровень, отлично для ролевых игр
          "deepseek/deepseek-r1:free",                  // сильная альтернатива
          "google/gemma-3-27b-it:free",                 // быстрый fallback
        ],
        route:       "fallback",
        messages:    openaiMessages,
        max_tokens:  1000,
        temperature: 0.9,
      }),
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      return res.status(500).json({ proxy_error: "Non-JSON response", body: text.slice(0, 300) });
    }

    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(500).json({ proxy_error: data });
    }

    const text = data?.choices?.[0]?.message?.content || "{}";
    return res.status(200).json({
      content: [{ type: "text", text }]
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Proxy error", details: err.message });
  }
}
