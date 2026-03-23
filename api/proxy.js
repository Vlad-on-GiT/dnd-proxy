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

    // Конвертируем формат Anthropic → OpenAI (DeepSeek совместим с OpenAI)
    const openaiMessages = [];
    if (system) openaiMessages.push({ role: "system", content: system });
    for (const msg of messages) openaiMessages.push({ role: msg.role, content: msg.content });

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model:       "deepseek-chat",   // DeepSeek-V3 — лучшее соотношение цена/качество
        messages:    openaiMessages,
        max_tokens:  1000,
        temperature: 0.9,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(500).json({ proxy_error: data });
    }

    // Конвертируем ответ DeepSeek → формат Anthropic (чтобы game.html не менять)
    const text = data?.choices?.[0]?.message?.content || "{}";
    return res.status(200).json({
      content: [{ type: "text", text }]
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Proxy error", details: err.message });
  }
}
