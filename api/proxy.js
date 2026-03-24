export const config = {
  api: {
    bodyParser:  { sizeLimit: '4mb' },
    maxDuration: 60,
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

    // Конвертируем формат Anthropic → Gemini
    // Anthropic: messages = [{role:'user'|'assistant', content:'...'}]
    // Gemini: contents = [{role:'user'|'model', parts:[{text:'...'}]}]
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const geminiBody = {
      system_instruction: {
        parts: [{ text: system || 'Ты — рассказчик, ведущий приключение.' }],
      },
      contents,
      generationConfig: {
        maxOutputTokens: max_tokens || 2000,
        temperature: 1.0,
        topP: 0.95,
      },
    };

    const model  = 'gemini-2.5-flash-lite';
    const apiKey = process.env.GEMINI_API_KEY;
    const url    = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(geminiBody),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(500).json({ proxy_error: data });
    }

    // Конвертируем ответ Gemini → формат Anthropic (который ожидает game.js)
    const candidate   = data.candidates?.[0];
    const text        = candidate?.content?.parts?.[0]?.text || '';
    const finishReason = candidate?.finishReason || 'STOP'; // STOP | MAX_TOKENS | SAFETY | RECITATION
    return res.status(200).json({
      content:      [{ type: 'text', text }],
      finishReason, // передаём клиенту чтобы он знал об обрыве
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Proxy error', details: err.message });
  }
}
