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

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    // AgentRouter: base URL = https://agentrouter.org/v1, endpoint = /messages
    const response = await fetch("https://agentrouter.org/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         process.env.AGENTROUTER_API_KEY,
        "anthropic-version": "2023-06-01",
        "Authorization":     `Bearer ${process.env.AGENTROUTER_API_KEY}`,
      },
      body: JSON.stringify(req.body),
    });

    // Если вернулся не JSON — показываем текст для диагностики
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      return res.status(500).json({ proxy_error: "Non-JSON response", body: text.slice(0, 300) });
    }

    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(500).json({ proxy_error: data });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Proxy error", details: err.message });
  }
}
