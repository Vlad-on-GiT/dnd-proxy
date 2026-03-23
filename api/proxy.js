export default async function handler(req, res) {

  // CORS — разрешаем только ваш сайт на GitHub Pages
  res.setHeader("Access-Control-Allow-Origin", "https://vlad-on-git.github.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Обработка Preflight запроса от браузера
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Метод не поддерживается" });
  }

  try {
    // Подготовка тела запроса для Groq
    // Мы берем данные из req.body, но гарантируем, что используется нужная модель
    const groqPayload = {
      ...req.body,
      model: "llama-4-70b-scout", // Форсируем использование модели для D&D
    };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, // Ключ из настроек Vercel
      },
      body: JSON.stringify(groqPayload),
    });

    const data = await response.json();

    // Пересылаем статус и данные обратно на фронтенд
    return res.status(response.status).json(data);

  } catch (err) {
    console.error("Ошибка проксирования Groq:", err);
    return res.status(500).json({ error: "Ошибка прокси-сервера при обращении к Groq" });
  }
}
