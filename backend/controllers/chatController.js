const supabase = require("../utils/supabaseClient");
const { chatWithAI } = require("../services/openRouterService");

const testAPI = async (req, res) => {
  try {
    const content = await chatWithAI("Hello");
    return res.json({ message: "✅ API Key is valid!", content });
  } catch (error) {
    return res.status(500).json({
      error: "❌ API Key is invalid or OpenRouter is down.",
      details: error?.response?.data || error.message,
    });
  }
};

const chat = async (req, res) => {
  const { message, chat_id, category = "casual" } = req.body;
  const userId = req.user.id;

  if (!message) return res.status(400).json({ error: "❌ Message is required." });

  try {
    const aiResponse = await chatWithAI(message);

    if (chat_id) {
      const { data, error } = await supabase
        .from("chats")
        .select("messages")
        .eq("id", chat_id)
        .eq("user_id", userId)
        .single();

      if (error) throw new Error(error.message);

      const updatedMessages = [...data.messages, { user_message: message, ai_response: aiResponse }];

      await supabase.from("chats").update({ messages: updatedMessages }).eq("id", chat_id);

      return res.json({ chat_id, answer: aiResponse });
    } else {
      const { data, error } = await supabase
        .from("chats")
        .insert([
          {
            user_id: userId,
            messages: [{ user_message: message, ai_response: aiResponse }],
            category,
          },
        ])
        .select("id")
        .single();

      if (error) throw new Error(error.message);

      return res.json({ chat_id: data.id, answer: aiResponse });
    }
  } catch (error) {
    return res.status(500).json({ error: "❌ Failed to get AI response." });
  }
};

const chatHistory = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("chats")
      .select("id, messages, created_at, category")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const history = data.map((chat) => ({
      id: chat.id,
      title: chat.messages?.[0]?.user_message || "Untitled Chat",
      messages: chat.messages,
      category: chat.category || "casual",
    }));

    return res.json({ history });
  } catch (error) {
    return res.status(500).json({ error: "❌ Failed to fetch chat history." });
  }
};

const deleteChat = async (req, res) => {
  const { chat_id } = req.body;
  const userId = req.user.id;

  try {
    const { error } = await supabase
      .from("chats")
      .delete()
      .eq("id", chat_id)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "❌ Failed to delete chat." });
  }
};

const rateResponse = async (req, res) => {
  const { chat_id, message_index, rating } = req.body;

  if (!chat_id || message_index === undefined || !rating) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const { error } = await supabase
      .from("ai_ratings")
      .insert([{ chat_id, message_index, rating, user_id: req.user.id }]);

    if (error) throw error;

    res.status(200).json({ success: true, message: "👍 Rating saved successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  testAPI,
  chat,
  chatHistory,
  deleteChat,
  rateResponse,
};
