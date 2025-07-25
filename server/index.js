// server/index.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3001;

// ────────────────── 中间件 ──────────────────
app.use(cors());
app.use("/static", express.static(path.join(__dirname, "public")));
app.use('/user', express.static(path.join(__dirname, 'public/user_data')));
app.use(express.json()); // 等价于 body‑parser 的 json()

// voteStore.json 的绝对路径
const VOTE_FILE = path.join(__dirname, "voteStore.json");

// ──────────────── POST /api/saveMapping ────────────────
app.post("/api/saveMapping", (req, res) => {
  const { userId, mapping } = req.body;      // ← 前端发送的是 mapping
  const timestamp = new Date().toISOString();

  if (!userId || !mapping) {
    return res.status(400).json({ error: "Missing userId or mapping" });
  }

  // 读旧文件，确保拿到的是数组
  let data = [];
  if (fs.existsSync(VOTE_FILE)) {
    try {
      const raw = fs.readFileSync(VOTE_FILE, "utf-8").trim();
      const parsed = raw ? JSON.parse(raw) : [];
      data = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn("⚠️ voteStore.json 解析失败，已重置为空数组");
      data = [];
    }
  }

  // 追加新记录
  const entry = { userId, mapping, timestamp };
  data.push(entry);

  // 写回文件
  fs.writeFileSync(VOTE_FILE, JSON.stringify(data, null, 2));
  return res.json({ status: "success", entry });
});

// ────────────────── 启动服务器 ──────────────────
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
