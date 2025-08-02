const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'https://user-study-server-production.up.railway.app'
];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));
app.options('*', cors());      

app.use(express.json());           


app.post('/api/saveMapping', async (req, res) => {
  const { userId, mapping } = req.body;

  try {
    await redis.set(`mapping:${userId}`, JSON.stringify(mapping));
    res.status(200).json({ message: "Mapping saved in Redis" });
  } catch (error) {
    console.error("Redis save error:", error);
    res.status(500).json({ error: "Failed to save mapping" });
  }
});
app.get('/api/health', (req, res) => res.send('OK'));

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/user',   express.static(path.join(__dirname, 'public/user_data')));

const VOTE_FILE = path.join(__dirname, "voteStore.json");

// ──────────────── POST /api/saveMapping ────────────────
app.post("/api/saveMapping", (req, res) => {
  const { userId, mapping } = req.body;      
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
