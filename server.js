const express = require("express");
const mongoose = require("mongoose");
const { connectDB } = require("./lib/mongo.js");

const app = express();
app.use(express.json());

const chatSchema = new mongoose.Schema({
  index: Number,
  chatId: String
});

const Chat = mongoose.models.Chat || mongoose.model("Chat", chatSchema);

async function getNextIndex() {
  await connectDB();
  const last = await Chat.findOne().sort({ index: -1 });
  return last ? last.index + 1 : 1;
}

app.post("/store", async (req, res) => {
  await connectDB();
  const { chatId } = req.body;

  const exists = await Chat.findOne({ chatId });
  if (exists) return res.json({ message: "Already exists", index: exists.index });

  const idx = await getNextIndex();
  await Chat.create({ index: idx, chatId });

  res.json({ message: "Stored", index: idx });
});

app.get("/chat", async (req, res) => {
  await connectDB();
  const index = parseInt(req.query.index);

  const user = await Chat.findOne({ index });
  if (!user) return res.json({ error: "Not found" });

  res.json(user);
});

app.listen(3000, () => console.log("API Ready"));
