const express = require("express");
const mongoose = require("mongoose");
const app = express();

app.use(express.json());

mongoose.connect("YOUR_MONGO_URI")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

const chatSchema = new mongoose.Schema({
  index: Number,
  chatId: String
});

const Chat = mongoose.model("Chat", chatSchema);

async function getNextIndex() {
  const last = await Chat.findOne().sort({ index: -1 });
  return last ? last.index + 1 : 1;
}

app.post("/store", async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) return res.status(400).json({ error: "No chatId" });

    const exists = await Chat.findOne({ chatId });

    if (exists)
      return res.json({ message: "Already exists", index: exists.index });

    const index = await getNextIndex();

    await Chat.create({ index, chatId });

    return res.json({ message: "Stored", index });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/chat", async (req, res) => {
  const index = parseInt(req.query.index);
  const data = await Chat.findOne({ index });
  if (!data) return res.json({ error: "Not found" });
  res.json(data);
});

app.listen(3000, () => console.log("API running on 3000"));
    
