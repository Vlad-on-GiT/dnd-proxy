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
    const { system, messages, max_tokens } = req.body;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: max_tokens || 1200,
        system,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(500).json({ proxy_error: data });
    }

    // Anthropic формат совпадает с тем что ожидает game.js — возвращаем как есть
    return res.status(200).json(data);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Proxy error", details: err.message });
  }
}
