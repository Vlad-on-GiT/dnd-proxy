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

    // Конвертируем формат Anthropic → Groq (OpenAI-совместимый)
    const groqMessages = [];

    if (system) {
      groqMessages.push({ role: "system", content: system });
    }

    for (const msg of messages) {
      groqMessages.push({ role: msg.role, content: msg.content });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       "llama-3.3-70b-versatile",
        messages:    groqMessages,
        max_tokens:  1000,
        temperature: 0.9,
      }),
    });

    const data = await response.json();

    // Если Groq вернул ошибку — пробрасываем для диагностики
    if (!response.ok || data.error) {
      return res.status(500).json({ groq_error: data });
    }

    // Конвертируем ответ Groq → формат Anthropic (чтобы game.html не менять)
    const text = data?.choices?.[0]?.message?.content || "{}";
    return res.status(200).json({
      content: [{ type: "text", text }]
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Proxy error", details: err.message });
  }
}
