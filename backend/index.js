require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const http = require("http");
const { Server } = require("socket.io"); // 🔌 Import socket.io

const app = express();
const server = http.createServer(app);

// 🔌 Initialize socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // 🔒 Change to your frontend domain in production
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

const API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_ID = "mistralai/mistral-small-3.1-24b-instruct:free";

// Supabase Setup
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🔒 Middleware: Verify Supabase Auth token
const verifyUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized: No token provided" });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: "Unauthorized: Invalid token" });

  req.user = data.user;
  next();
};

// ✅ API Key Test Route
app.get("/test-api", async (req, res) => {
  try {
    const response = await axios.post(
      OPENROUTER_URL,
      { model: MODEL_ID, messages: [{ role: "user", content: "Hello" }] },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.json({ message: "✅ API Key is valid!" });
  } catch (error) {
    console.error("❌ API Test Failed:", error?.response?.data || error.message);
    return res.status(500).json({
      error: "❌ API Key is invalid or OpenRouter is down.",
      details: error?.response?.data || "No response from OpenRouter.",
    });
  }
});

// 🧠 Chat with AI (Requires Auth)
app.post("/chat", verifyUser, async (req, res) => {
  const { message, chat_id, category = "casual" } = req.body;
  const userId = req.user.id;

  if (!message) return res.status(400).json({ error: "❌ Message is required." });

  try {
    const response = await axios.post(
      OPENROUTER_URL,
      { model: MODEL_ID, messages: [{ role: "user", content: message }] },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiResponse = response.data.choices?.[0]?.message?.content || "No response";

    if (chat_id) {
      const { data, error } = await supabase
        .from("chats")
        .select("messages")
        .eq("id", chat_id)
        .eq("user_id", userId)
        .single();

      if (error) throw new Error(error.message);

      const updatedMessages = [
        ...data.messages,
        { user_message: message, ai_response: aiResponse },
      ];

      await supabase
        .from("chats")
        .update({ messages: updatedMessages })
        .eq("id", chat_id);

      // 🔌 Emit AI response via WebSocket
      io.to(chat_id).emit("receive_message", {
        role: "assistant",
        content: aiResponse,
      });

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

      // 🔌 Emit AI response for newly created chat
      io.to(data.id).emit("receive_message", {
        role: "assistant",
        content: aiResponse,
      });

      return res.json({ chat_id: data.id, answer: aiResponse });
    }
  } catch (error) {
    console.error("❌ OpenRouter API Error:", error.message);
    return res.status(500).json({ error: "❌ Failed to get AI response." });
  }
});

// 📜 Fetch Chat History
app.get("/chat-history", verifyUser, async (req, res) => {
  const userId = req.user.id;

  try {
    const { data, error } = await supabase
      .from("chats")
      .select("id, messages, created_at, category")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const chatHistory = data.map((chat) => ({
      id: chat.id,
      title: chat.messages?.[0]?.user_message || "Untitled Chat",
      messages: chat.messages,
      category: chat.category || "casual",
    }));

    return res.json({ history: chatHistory });
  } catch (error) {
    console.error("❌ Fetch History Error:", error.message);
    return res.status(500).json({ error: "❌ Failed to fetch chat history." });
  }
});

// ❌ Delete Chat
app.delete("/delete-chat", verifyUser, async (req, res) => {
  const { chat_id } = req.body;
  const userId = req.user.id;

  if (!chat_id) return res.status(400).json({ error: "❌ Chat ID is required." });

  try {
    const { error } = await supabase
      .from("chats")
      .delete()
      .eq("id", chat_id)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);

    return res.json({ success: true });
  } catch (error) {
    console.error("❌ Delete Chat Error:", error.message);
    return res.status(500).json({ error: "❌ Failed to delete chat." });
  }
});

// ⭐ Rate Response
app.post("/rate-response", verifyUser, async (req, res) => {
  const { chat_id, message_index, rating } = req.body;
  const user_id = req.user.id;

  if (!chat_id || message_index === undefined || !rating) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const { error } = await supabase
      .from("ai_ratings")
      .insert([{ chat_id, message_index, rating, user_id }]);

    if (error) throw error;

    res.status(200).json({ success: true, message: "👍 Rating saved successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🌐 Root Welcome Route
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head><title>ChatNova API</title></head>
      <body style="font-family: Arial; text-align: center; margin-top: 50px;">
        <h1>🚀 Welcome to ChatNova Backend API</h1>
        <p>Your server is up and running!</p>
      </body>
    </html>
  `);
});

// 🔌 WebSocket Chat Events
io.on("connection", (socket) => {
  console.log("🟢 A user connected:", socket.id);

  // Join a chat room
  socket.on("join_chat", (chat_id) => {
    socket.join(chat_id);
    console.log(`📥 User joined chat room: ${chat_id}`);
  });

  // Send user message to room
  socket.on("send_message", ({ chat_id, user_message }) => {
    io.to(chat_id).emit("receive_message", {
      role: "user",
      content: user_message,
    });
    console.log(`💬 User message in ${chat_id}:`, user_message);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// 🚀 Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
