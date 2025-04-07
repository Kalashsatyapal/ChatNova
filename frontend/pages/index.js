import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {FaPaperPlane,FaSignOutAlt,FaTrashAlt,FaPlus,FaSun,FaMoon,} from "react-icons/fa";
import Auth from "../components/Auth";
import Rating from "../components/rating";
import io from "socket.io-client";
// Prevent multiple socket connections
let socket;
if (!socket) {socket = io(process.env.NEXT_PUBLIC_BACKEND_URL);}
export default function Home() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeChat, setActiveChat] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [chatCategory, setChatCategory] = useState("casual");
  const ChatLayout = ({ children, user }) => {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  useEffect(() => {
    if (user) {
      setIsActive(true);
      setSeconds(0); // Reset on new login
    }
  }, [user]);
  useEffect(() => {
    let interval;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);
  const formatTime = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };
  useEffect(() => {
    const storedDarkMode = localStorage.getItem("darkMode");
    setDarkMode(storedDarkMode === "true");
  }, []);
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", newMode);
  };
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) setUser(data.session.user);
    };
    getSession();
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session ? session.user : null);
      }
    );
    return () => listener?.subscription?.unsubscribe();
  }, []);
  useEffect(() => {
    if (user) fetchChatHistory();
  }, [user]);
  useEffect(() => {
    socket.on("new_message", (messageData) => {
      setChatHistory((prevHistory) => {
        const updatedHistory = [...prevHistory];
        const chat = updatedHistory.find(
          (chat) => chat.id === messageData.chat_id
        );
        if (chat) {
          chat.messages.push({
            user_message: messageData.message,
            ai_response: messageData.ai_response,
          });
        }
        return updatedHistory;
      });
    });
    return () => socket.off("new_message");
  }, []);
  const fetchChatHistory = async () => {
    if (!user) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat-history`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await res.json();
    if (data.history) setChatHistory(data.history);
  };
  const sendMessage = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setError("");
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message,
        chat_id: activeChat,
        category: chatCategory, // ✅ Send category to backend
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) {
      setError(data.error);
    } else {
      const newChatEntry = { user_message: message, ai_response: data.answer };
      if (activeChat) {
        setChatHistory((prev) =>
          prev.map((chat) =>
            chat.id === activeChat
              ? { ...chat, messages: [...chat.messages, newChatEntry] }
              : chat
          )
        );
      } else {
        const newChat = {
          id: data.chat_id,
          title: message,
          category: chatCategory,
          messages: [newChatEntry],
        };
        setChatHistory([newChat, ...chatHistory]);
        setActiveChat(data.chat_id);
      }
      setMessage("");
      socket.emit("send_message", {
        message,
        ai_response: data.answer,
        chat_id: data.chat_id,
      });
    }
  };
  const deleteChatHistory = async (chatId) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/delete-chat`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chat_id: chatId }),
      }
    );
    const data = await res.json();
    if (data.success) {
      setChatHistory(chatHistory.filter((chat) => chat.id !== chatId));
      if (activeChat === chatId) setActiveChat(null);
    } else {
      setError(data.error || "Failed to delete chat.");
    }
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };
  const handleRating = async (chatId, messageIndex, rating) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;

    await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/save-rating`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        chat_id: chatId,
        message_index: messageIndex,
        rating,
      }),
    });
    setChatHistory((prevHistory) =>
      prevHistory.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: chat.messages.map((msg, idx) =>
                idx === messageIndex ? { ...msg, rating } : msg
              ),
            }
          : chat
      )
    );
  };
  const formatAIResponse = (response) => {
    const sentences = response.split(/(?<=[.!?])\s+/);
    return sentences.map((sentence, index) => <p key={index}>{sentence}</p>);
  };
  if (!user) return <Auth onAuthSuccess={setUser} />;
  return (
    <div
      className={`flex h-screen ${
        darkMode ? "bg-gray-900 text-white" : "bg-white text-black"
      }`}
    >
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-64 p-4 ${
          darkMode ? "bg-black text-white" : "bg-gray-200 text-black"
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-lg font-extrabold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent tracking-wider uppercase border-b-2 border-blue-500 pb-1 animate-pulse">
            Chat History
          </h1>
        </div>
        <ul>
          {chatHistory.map((chat) => (
            <li
              key={chat.id}
              className={`p-2 border-b cursor-pointer ${
                activeChat === chat.id ? "bg-gray-300" : ""
              }`}
              onClick={() => setActiveChat(chat.id)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <strong>{chat.title}</strong>
                  <div className="text-xs text-gray-500">
                    {chat.category || "casual"}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChatHistory(chat.id);
                  }}
                  className="p-1 rounded text-white bg-red-500 mx-2"
                >
                  <FaTrashAlt size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {/* Chat Area */}
      <div className="flex-1 p-4 ml-64">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse">
            ChatNova
          </h1>
          <div className="flex gap-2">
             {/* Stopwatch */}
        {user && (
          <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm">
            ⏱️ {formatTime(seconds)}
          </div>
        )}
            <button
              onClick={toggleDarkMode}
              className="p-2 bg-gray-700 text-white rounded"
            >
              {darkMode ? <FaSun /> : <FaMoon />}
            </button>
            <button
              onClick={() => {
                setActiveChat(null);
                setMessage("");
                setChatCategory("casual"); // ✅ Reset category
              }}
              className="p-2 bg-green-500 text-white rounded"
            >
              <FaPlus />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 bg-red-500 text-white rounded"
            >
              <FaSignOutAlt />
            </button>
          </div>
        </div>
        <div
          className={`border p-4 rounded h-[65vh] overflow-auto ${
            darkMode ? "bg-gray-800" : "bg-gray-100"
          }`}
        >
          {loading && (
            <div className="flex justify-center items-center mb-4">
              <div className="text-blue-500 font-semibold animate-pulse">
                Generating AI response...
              </div>
            </div>
          )}
          {activeChat &&
          chatHistory.find((chat) => chat.id === activeChat)?.messages
            .length ? (
            chatHistory
              .find((chat) => chat.id === activeChat)
              .messages.map((msg, index) => (
                <div key={index} className="mb-3">
                  <div className="font-semibold">You:</div>
                  <div className="mb-2 p-3 rounded shadow bg-white text-black">
                    {msg.user_message}
                  </div>
                  <div className="font-semibold">AI:</div>
                  <div
                    className={`p-3 rounded shadow ${
                      darkMode
                        ? "bg-blue-500 text-white"
                        : "bg-blue-100 text-black"
                    }`}
                  >
                    {formatAIResponse(msg.ai_response)}
                    <Rating
                      rating={msg.rating}
                      onRate={(value) => handleRating(activeChat, index, value)}
                    />
                  </div>
                </div>
              ))
          ) : (
            <p className="text-gray-500">No chat history yet.</p>
          )}
        </div>
        {error && <p className="text-red-500 mt-2">{error}</p>}
        <div className="flex mt-4 gap-2">
          <select
            value={chatCategory}
            onChange={(e) => setChatCategory(e.target.value)}
            className="p-2 rounded border"
          >
            <option value="casual">Casual</option>
            <option value="professional">Professional</option>
            <option value="creative">Creative</option>
          </select>
          <input
            type="text"
            className={`flex-1 p-2 border rounded ${
              darkMode ? "bg-gray-800 text-white border-gray-600" : ""
            }`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
          />
          <button
            onClick={sendMessage}
            className="p-2 bg-blue-500 text-white rounded"
            disabled={loading}
          >
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </div>
  );
}}