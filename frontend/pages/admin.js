import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { FaTrashAlt, FaStar } from "react-icons/fa";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data?.session?.user ?? null);
    };
    getSession();
  }, []);

  useEffect(() => {
    if (user) fetchAllChats();
  }, [user]);

  const fetchAllChats = async () => {
    setLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/all-chats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
      } else {
        setError(data.error || "Failed to load data.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while fetching data.");
    } finally {
      setLoading(false);
    }
  };

  const deleteChat = async (chatId) => {
    if (!confirm("Are you sure you want to delete this chat?")) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/delete-chat`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ chat_id: chatId }),
    });
    const data = await res.json();
    if (data.success) {
      setSessions((prev) =>
        prev.map((s) => ({
          ...s,
          chats: s.chats.filter((c) => c.id !== chatId),
        }))
      );
      setSelectedChat(null);
    } else {
      alert("Failed to delete chat.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-black p-4">
      <h1 className="text-4xl font-bold mb-6 text-center text-blue-600">Admin Dashboard</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {loading ? (
        <p className="text-gray-600 text-center">Loading chats...</p>
      ) : (
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-1/4 bg-white p-4 rounded shadow overflow-y-auto h-[80vh]">
            <h2 className="text-xl font-semibold mb-3">User Sessions</h2>
            {sessions.map((session) => (
              <div key={session.id} className="mb-3">
                <h3 className="text-sm font-bold text-blue-700">{session.user_email}</h3>
                <ul className="ml-2 mt-1">
                  {session.chats.map((chat) => (
                    <li
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className="cursor-pointer p-2 rounded hover:bg-blue-100"
                    >
                      📄 {chat.title}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Chat Viewer */}
          <div className="flex-1 bg-white p-6 rounded shadow overflow-y-auto h-[80vh]">
            {selectedChat ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedChat.title}</h2>
                    <p className="text-sm text-gray-500">Category: {selectedChat.category}</p>
                  </div>
                  <button
                    className="text-white bg-red-500 px-3 py-1 rounded flex items-center gap-1"
                    onClick={() => deleteChat(selectedChat.id)}
                  >
                    <FaTrashAlt /> Delete
                  </button>
                </div>
                <div>
                  {selectedChat.messages.map((msg, idx) => (
                    <div key={idx} className="mb-4 border p-4 rounded shadow-sm bg-gray-50">
                      <p className="font-semibold">User:</p>
                      <p className="mb-2">{msg.user_message}</p>
                      <p className="font-semibold">AI:</p>
                      <p className="mb-2 bg-blue-100 p-2 rounded">{msg.ai_response}</p>
                      {msg.rating && (
                        <p className="flex items-center gap-1 text-yellow-500">
                          <FaStar /> Rated: {msg.rating}/5
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-gray-500">Select a chat to view details</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
