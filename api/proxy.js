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
      "stepfun/step-3.5-flash:free",
      "deepseek/deepseek-chat-v3-5:free",
      "google/gemini-2.5-flash-lite-preview-06-17:free",
      "mistralai/mistral-7b-instruct:free",
    ];

    let lastError = null;

    for (const model of MODELS) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "HTTP-Referer":  "https://vlad-on-git.github.io/DND/",
            "X-Title":       "Khranitel Svitkov",
          },
          body: JSON.stringify({
            model,
            messages:    openaiMessages,
            max_tokens:  1000,
            temperature: 0.9,
            // Просим строго JSON
            response_format: { type: "text" },
          }),
        });

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          lastError = { model, error: "Non-JSON response" };
          continue;
        }

        const data = await response.json();

        if (!response.ok || data.error) {
          lastError = { model, error: data.error };
          continue;
        }

        const text = data?.choices?.[0]?.message?.content || "";

        // Если модель вернула пустой ответ — пробуем следующую
        if (!text || text.trim() === "{}" || text.trim() === "") {
          lastError = { model, error: "Empty response" };
          continue;
        }

        console.log("Model used:", model, "| Response length:", text.length);

        return res.status(200).json({
          content: [{ type: "text", text }]
        });

      } catch (modelErr) {
        lastError = { model, error: modelErr.message };
        continue;
      }
    }

    return res.status(500).json({ proxy_error: "All models failed", last: lastError });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Proxy error", details: err.message });
  }
}
