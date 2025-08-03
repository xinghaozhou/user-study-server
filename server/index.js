/* ───────────── server/index.js ───────────── */
console.log('🔑 REDIS_URL =', process.env.REDIS_URL || 'NOT SET');

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { createClient } = require('redis');

const app  = express();
const PORT = process.env.PORT || 3001;

const allowList = [
  'http://localhost:5173',
  'https://user-study-server.vercel.app',                     
  'https://user-study-server-production.up.railway.app'       
];
const vercelPreviewRE = /^https:\/\/user-study-server-git-.*\.vercel\.app$/;

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl / probe 没有 Origin
    if (allowList.includes(origin) || vercelPreviewRE.test(origin))
      return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
};

app.options('*', cors(corsOptions));

/* ★ 让所有 /api 路由都挂上 CORS 头 */
app.use('/api', cors(corsOptions));
/* ---------------------------------- */

app.use(express.json());

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/user',   express.static(path.join(__dirname, 'public/user_data')));

/* ---------- ③ Redis ---------- */
const redisURL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis    = createClient({ url: redisURL });

redis.on('error', err => console.error('❌ Redis error:', err));
(async () => {
  try {
    await redis.connect();
    console.log('✅ Connected to Redis');
  } catch (err) {
    console.error('❌ Failed to connect to Redis:', err);
  }
})();

/* ---------- ④ API ---------- */
app.post('/api/saveMapping', async (req, res) => {
  const { userId, mapping, timestamp = new Date().toISOString() } = req.body;
  if (!userId || !mapping) return res.status(400).json({ error: 'Missing userId or mapping' });

  try {
    await redis.set(`mapping:${userId}`, JSON.stringify({ mapping, timestamp }));
    console.log('✅ Saved mapping for', userId);
    res.json({ message: 'Mapping saved to Redis' });
  } catch (err) {
    console.error('❌ Redis save error:', err);
    res.status(500).json({ error: 'Failed to save mapping' });
  }
});

app.get('/api/getMapping', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId query param' });

  try {
    const raw  = await redis.get(`mapping:${userId}`);
    res.json({ userId, data: raw ? JSON.parse(raw) : null });
  } catch (err) {
    console.error('❌ Redis read error:', err);
    res.status(500).json({ error: 'Failed to retrieve mapping' });
  }
});

app.get('/api/health', (_, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
/* ─────────────────────────────────────────── */
