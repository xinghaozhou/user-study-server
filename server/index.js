/* ─── server/index.js ─────────────────────── */
console.log('🔑 REDIS_URL =', process.env.REDIS_URL || 'NOT SET');
console.log('=== RUNNING', __filename, new Date().toISOString());

const express      = require('express');
const cors         = require('cors');
const path         = require('path');
const { createClient } = require('redis');

const app  = express();
const PORT = process.env.PORT || 3001;

app.options('*', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin'      : req.get('Origin') || '*',
    'Access-Control-Allow-Methods'     : 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers'     : 'Content-Type',
    'Access-Control-Allow-Credentials' : 'true'
  });
  return res.sendStatus(204);
});

const allowList = [
  'http://localhost:5173',
  'https://user-study-server.vercel.app',
  'https://user-study-server-production.up.railway.app'
];
const vercelPreviewRE = /^https:\/\/user-study-server-git-.*\.vercel\.app$/;
app.use('/api', cors({
  origin: (origin, cb) => {
    if (!origin                                  ) return cb(null, true); // curl
    if (allowList.includes(origin) || vercelPreviewRE.test(origin))
      return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/user',   express.static(path.join(__dirname, 'public/user_data')));

/* ── 3. Redis ── */
const redisURL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis    = createClient({ url: redisURL });
redis.on('error', err => console.error('❌ Redis error:', err));
redis.connect().then(() => console.log('✅ Connected to Redis'));

/* ── 4. REST API ── */
app.post('/api/saveMapping', async (req, res) => {
  const { userId, mapping, timestamp = new Date().toISOString() } = req.body;
  if (!userId || !mapping) return res.status(400).json({ error: 'Missing userId or mapping' });

  await redis.set(`mapping:${userId}`, JSON.stringify({ mapping, timestamp }));
  console.log('✅ Saved mapping for', userId);
  res.json({ message: 'Mapping saved to Redis' });
});

app.get('/api/getMapping', async (req, res) => {
  const raw = await redis.get(`mapping:${req.query.userId}`);
  res.json({ data: raw ? JSON.parse(raw) : null });
});

app.get('/api/health', (_, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
/* ─────────────────────────────────────────── */
