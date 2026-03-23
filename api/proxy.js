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

    const MODELS = [
      "meta-llama/llama-4-scout-17b-16e-instruct", // Llama 4 Scout если доступна
      "llama-3.3-70b-versatile",                    // Fallback — проверенная модель
      "llama3-70b-8192",                            // Последний резерв
    ];

    let lastError = null;

    for (const model of MODELS) {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages:    openaiMessages,
          max_tokens:  1000,
          temperature: 0.9,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        lastError = { model, error: data.error?.message || response.status };
        continue;
      }

      const text = data?.choices?.[0]?.message?.content || "";
      if (!text || text.trim() === "{}") {
        lastError = { model, error: "Empty response" };
        continue;
      }

      return res.status(200).json({
        content: [{ type: "text", text }]
      });
    }

    return res.status(500).json({ proxy_error: "All models failed", last: lastError });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Proxy error", details: err.message });
  }
}
