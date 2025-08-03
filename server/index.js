// server/index.js – fully patched CORS‑friendly version
// ----------------------------------------------------
console.log('🔑 REDIS_URL =', process.env.REDIS_URL || 'NOT SET');
console.log('=== RUNNING', __filename, new Date().toISOString());

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { createClient } = require('redis');

const app  = express();
const PORT = process.env.PORT || 3001;

// ────────────────────────────────────────────────────────────
// 1. GLOBAL pre‑flight handler (handles all OPTIONS requests)
// ────────────────────────────────────────────────────────────
app.options('*', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin'      : req.get('Origin') || '*',
    'Access-Control-Allow-Methods'     : 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers'     : 'Content-Type',
    'Access-Control-Allow-Credentials' : 'true'
  });
  return res.sendStatus(204);
});

// ────────────────────────────────────────────────────────────
// 2. CORS middleware for all /api routes
// ────────────────────────────────────────────────────────────
const allowList = [
  'http://localhost:5173',                                   // local dev
  'https://user-study-server.vercel.app',                    // production FE
  'https://user-study-server-production.up.railway.app'      // backend self
];
const vercelPreviewRE = /^https:\/\/user-study-server-git-.*\.vercel\.app$/;

app.use('/api', cors({
  origin: (origin, cb) => {
    // no Origin → curl / health‑check etc.
    if (!origin) return cb(null, true);
    if (allowList.includes(origin) || vercelPreviewRE.test(origin))
      return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// ────────────────────────────────────────────────────────────
// 3. Misc middleware & static assets
// ────────────────────────────────────────────────────────────
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/user',   express.static(path.join(__dirname, 'public/user_data')));

// ────────────────────────────────────────────────────────────
// 4. Redis client
// ────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────
// 5. REST API
// ────────────────────────────────────────────────────────────
app.post('/api/saveMapping', async (req, res) => {
  const { userId, mapping, timestamp = new Date().toISOString() } = req.body;
  if (!userId || !mapping)
    return res.status(400).json({ error: 'Missing userId or mapping' });

  try {
    await redis.set(`mapping:${userId}`, JSON.stringify({ mapping, timestamp }));
    console.log('✅ Saved mapping for', userId);
    return res.json({ message: 'Mapping saved to Redis' });
  } catch (err) {
    console.error('❌ Redis save error:', err);
    return res.status(500).json({ error: 'Failed to save mapping' });
  }
});

app.get('/api/getMapping', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const raw = await redis.get(`mapping:${userId}`);
    return res.json({ userId, data: raw ? JSON.parse(raw) : null });
  } catch (err) {
    console.error('❌ Redis read error:', err);
    return res.status(500).json({ error: 'Failed to retrieve mapping' });
  }
});

app.get('/api/health', (_, res) => res.send('OK'));

// ────────────────────────────────────────────────────────────
// 6. Start server
// ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
