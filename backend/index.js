require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
// WebSocket Setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
require("./socket/socketHandler")(io);
app.use(cors());
app.use(express.json());
//admin Route
const adminRoutes = require("./routes/adminRoutes");
app.use("/", adminRoutes);
// Routes
const chatRoutes = require("./routes/chatRoutes");
app.use("/", chatRoutes);
// Root Route
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
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
