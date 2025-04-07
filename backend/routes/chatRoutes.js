const express = require("express");
const router = express.Router();
const verifyUser = require("../middleware/verifyUser");
const {
  testAPI,
  chat,
  chatHistory,
  deleteChat,
  rateResponse,
} = require("../controllers/chatController");

router.get("/test-api", testAPI);
router.post("/chat", verifyUser, chat);
router.get("/chat-history", verifyUser, chatHistory);
router.delete("/delete-chat", verifyUser, deleteChat);
router.post("/rate-response", verifyUser, rateResponse);

module.exports = router;
