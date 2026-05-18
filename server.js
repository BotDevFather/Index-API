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

  const { password } = req.body;
  if (!password) return res.json({ error: "password required" });
  if (!ADMIN_PASSWORDS.includes(password)) return res.json({ error: "Invalid admin password" });

  const bots = await Bot.find();
  const chats = await Chat.find();

  let result = [];

  const chatMap = {};

  for (const chat of chats) {
    if (!chatMap[chat.chatId]) chatMap[chat.chatId] = [];
    const bot = bots.find(b => b.botUsername === chat.botUsername);
    if (bot) chatMap[chat.chatId].push(bot.botToken);
  }

  for (const chatId in chatMap) {
    result.push({
      chatId,
      botTokens: chatMap[chatId]
    });
  }

  res.json({ count: result.length, data: result });
});

const crypto = require("crypto");

app.post("/clk/generate", async (req, res) => {

  try {

    const {
      keyId,
      secret,
      duration_id,
      quantity
    } = req.body;

    if (
      !keyId ||
      !secret ||
      !duration_id
    ) {

      return res.status(400).json({

        error:
          "keyId, secret, duration_id required"

      });

    }

    const bodyObj = {

      duration_id:
        Number(duration_id),

      quantity:
        Number(quantity || 1)

    };

    const body =
      JSON.stringify(bodyObj);

    const ts =
      Math.floor(
        Date.now() / 1000
      ).toString();

    const nonce =
      crypto
        .randomBytes(16)
        .toString("hex");

    const path =
      "/api/v1/reseller/x/generate.php";

    const bodyHash =
      crypto
        .createHash("sha256")
        .update(body)
        .digest("hex");

    const signMessage =

      "POST\n" +
      path + "\n" +
      ts + "\n" +
      nonce + "\n" +
      bodyHash;

    const signature =
      crypto
        .createHmac(
          "sha256",
          Buffer.from(
            secret,
            "hex"
          )
        )
        .update(signMessage)
        .digest("hex");

    const response =
      await axios.post(

        "https://chotulink.online" +
        path,

        bodyObj,

        {

          headers: {

            "Content-Type":
              "application/json",

            "X-Api-Key":
              keyId,

            "X-Api-Timestamp":
              ts,

            "X-Api-Nonce":
              nonce,

            "X-Api-Signature":
              signature

          }

        }

      );

    res.json({

      success: true,

      debug: {

        timestamp:
          ts,

        nonce:
          nonce,

        body:
          bodyObj,

        bodyHash:
          bodyHash,

        signMessage:
          signMessage,

        signature:
          signature

      },

      response:
        response.data

    });

  } catch (e) {

    res.status(
      e.response?.status || 500
    ).json({

      success: false,

      status:
        e.response?.status,

      debug: {

        response:
          e.response?.data || null

      },

      error:
        e.message

    });

  }

});

app.listen(3000, () => console.log("API Ready"));
                    
