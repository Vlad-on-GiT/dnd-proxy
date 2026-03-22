export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "https://vlad-on-git.github.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { system, messages } = req.body;

    // Конвертируем формат Anthropic → Gemini
    // system prompt добавляем как первое сообщение от user с пометкой
    const geminiContents = [];

    if (system) {
      geminiContents.push({
        role: "user",
        parts: [{ text: `[SYSTEM INSTRUCTIONS - follow strictly]\n${system}` }]
      });
      geminiContents.push({
        role: "model",
        parts: [{ text: "Понял. Буду строго следовать инструкциям и отвечать только валидным JSON." }]
      });
    }

    // Конвертируем историю сообщений
    for (const msg of messages) {
      geminiContents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: {
          temperature:     0.9,
          maxOutputTokens: 1000,
        }
      }),
    });

    const data = await response.json();

    // Конвертируем ответ Gemini → формат Anthropic (чтобы game.html не менять)
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    return res.status(200).json({
      content: [{ type: "text", text }]
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Proxy error", details: err.message });
  }
}
