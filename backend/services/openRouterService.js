const axios = require("axios");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_ID = "mistralai/mistral-small-3.1-24b-instruct:free";

const chatWithAI = async (message) => {
  const response = await axios.post(
    OPENROUTER_URL,
    { model: MODEL_ID, messages: [{ role: "user", content: message }] },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices?.[0]?.message?.content || "No response";
};

module.exports = { chatWithAI };
