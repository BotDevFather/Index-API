const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const { connectDB } = require("./lib/mongo.js");

const app = express();
app.use(express.json());

const chatSchema = new mongoose.Schema({
  index: Number,
  chatId: String,
  botUsername: String
});

const botSchema = new mongoose.Schema({
  botToken: String,
  botUsername: String
});

const Chat = mongoose.models.Chat || mongoose.model("Chat", chatSchema);
const Bot = mongoose.models.Bot || mongoose.model("Bot", botSchema);

const ADMIN_PASSWORDS = ["admin123", "superpass"];

async function getBotUsername(botToken) {
  try {
    const url = `https://api.telegram.org/bot${botToken}/getMe`;
    const { data } = await axios.get(url);
    return data.ok ? data.result.username : null;
  } catch {
    return null;
  }
}

async function getNextIndex(botUsername) {
  const last = await Chat.findOne({ botUsername }).sort({ index: -1 });
  return last ? last.index + 1 : 1;
}

app.post("/admin/login", (req, res) => {
  const { password } = req.body;
  if (!password) return res.json({ error: "Password required" });
  if (ADMIN_PASSWORDS.includes(password)) return res.json({ message: "Admin login success" });
  res.json({ error: "Invalid password" });
});

app.post("/chat/store", async (req, res) => {
  await connectDB();
  const { botToken, chatId } = req.body;
  if (!botToken || !chatId) return res.json({ error: "botToken and chatId required" });
  const botUsername = await getBotUsername(botToken);
  if (!botUsername) return res.json({ error: "Invalid bot token" });

  let bot = await Bot.findOne({ botUsername });
  if (!bot) await Bot.create({ botToken, botUsername });
  else await Bot.updateOne({ botUsername }, { botToken });

  const exists = await Chat.findOne({ chatId, botUsername });
  if (exists) return res.json({ message: "Already exists", index: exists.index, bot: botUsername });

  const index = await getNextIndex(botUsername);
  await Chat.create({ index, chatId, botUsername });
  res.json({ message: "Stored", index, bot: botUsername });
});

app.post("/chat/get", async (req, res) => {
  await connectDB();
  const { botToken, index } = req.body;
  if (!botToken || !index) return res.json({ error: "botToken and index required" });
  const botUsername = await getBotUsername(botToken);
  if (!botUsername) return res.json({ error: "Invalid bot token" });

  const user = await Chat.findOne({ index, botUsername });
  if (!user) return res.json({ error: "Not found" });

  res.json({ index: user.index, chatId: user.chatId, bot: user.botUsername });
});

app.get("/admin/bots", async (req, res) => {
  await connectDB();
  const bots = await Bot.find();
  res.json({ count: bots.length, bots });
});

app.post("/admin/broadcast", async (req, res) => {
  await connectDB();

  const { password, message } = req.body;
  if (!password || !message) return res.json({ error: "password and message required" });
  if (!ADMIN_PASSWORDS.includes(password)) return res.json({ error: "Invalid admin password" });

  const bots = await Bot.find();
  if (bots.length === 0) return res.json({ error: "No bots found" });

  let totalSent = 0;
  let failedChats = 0;

  for (const bot of bots) {
    const chats = await Chat.find({ botUsername: bot.botUsername });

    for (const user of chats) {
      try {
        await axios.post(`https://api.telegram.org/bot${bot.botToken}/sendMessage`, {
          chat_id: user.chatId,
          text: message
        });
        totalSent++;
      } catch {
        failedChats++;
      }
    }
  }

  res.json({
    message: "Broadcast completed",
    totalSent,
    failedChats,
    botsUsed: bots.length
  });
});

app.listen(3000, () => console.log("API Ready"));
