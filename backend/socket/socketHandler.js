const socketHandler = (io) => {
    io.on("connection", (socket) => {
      console.log("🟢 A user connected:", socket.id);
  
      socket.on("join_chat", (chat_id) => {
        socket.join(chat_id);
        console.log(`📥 User joined chat room: ${chat_id}`);
      });
  
      socket.on("send_message", ({ chat_id, user_message }) => {
        io.to(chat_id).emit("receive_message", {
          role: "user",
          content: user_message,
        });
      });
  
      socket.on("disconnect", () => {
        console.log("🔴 User disconnected:", socket.id);
      });
    });
  };
  
  module.exports = socketHandler;
  