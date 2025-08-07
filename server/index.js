// server/index.js – CORS-friendly version
// ----------------------------------------------------
console.log('🔑 REDIS_URL =', process.env.REDIS_URL || 'NOT SET');
console.log('=== RUNNING', __filename, new Date().toISOString());

const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('redis');

const app = express();
const PORT = process.env.PORT || 3001;

// ---------- 1. CORS for every /api request & its pre-flight ----------
const allowList = [
  'http://localhost:5173',                                   // local dev
  'https://user-study-server.vercel.app',                    // production FE
];
const vercelPreviewRE = /^https:\/\/user-study-server-git-.*\.vercel\.app$/;


const SUMMARY_FILES = ['llama', 'gama', 'human']; 
const corsApi = cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl / health checks
    if (allowList.includes(origin) || vercelPreviewRE.test(origin))
      return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
});

app.use('/api', corsApi);        // normal /api requests
app.options('/api/*', corsApi);  // pre-flight for /api/*

// ---------- 2. body parsing & static assets --------------------------
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/user_data', express.static(path.join(__dirname, 'public/user_data')));


// ---------- 3. Redis client ------------------------------------------
const redisURL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = createClient({ url: redisURL });

redis.on('error', err => console.error('❌ Redis error:', err));
(async () => {
  try {
    await redis.connect();
    console.log('✅ Connected to Redis');
  } catch (err) {
    console.error('❌ Failed to connect to Redis:', err);
  }
})();

// ---------- 4. REST API ------------------------------------------------
app.get('/api/order/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const key = `order:${userId}`;

  try {
    const cached = await redis.get(key);
    if (cached) return res.json(JSON.parse(cached));  // 命中 → 直接返回

    const shuffled = SUMMARY_FILES
      .map(s => ({ source: s, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map((s, i) => ({
        label: String.fromCharCode(65 + i),   // A / B / C
        source: s.source,
      }));

    await redis.set(key, JSON.stringify({ order: shuffled }), { EX: 60 * 60 });

    return res.json({ order: shuffled });
  } catch (err) {
    console.error('❌ Redis order error:', err);
    return res.status(500).json({ error: 'Failed to get order' });
  }
});


app.post('/api/saveMapping', async (req, res) => {
  const { userId, mapping, timestamp = new Date().toISOString() } = req.body;
  if (!userId || !mapping)
    return res.status(400).json({ error: 'Missing userId or mapping' });

  const key = `mapping:${userId}`;
  try{
    const setRes = await redis.set(
      key,
      JSON.stringify({ mapping, savedAt: Date.now() }),
      { NX: true, EX: 60 * 60 }
    );

    if(setRes === null){
      const cached = await redis.get(key);
      console.log("Reusing cache mapping for", userId)
      return res.json({ status: 'cached', data: JSON.parse(cached) });
    }

    console.log('Saved mapping for', userId);
    return res.json({ status: 'saved', data: { mapping } });
    }catch (err) {
      console.error('Redis error:', err);
      return res.status(500).json({ error: 'Redis failure' });
  }

  // try {
  //   await redis.set(`mapping:${userId}`, JSON.stringify({ mapping, timestamp }));
  //   console.log('✅ Saved mapping for', userId);
  //   return res.json({ message: 'Mapping saved to Redis' });
  // } catch (err) {
  //   console.error('❌ Redis save error:', err);
  //   return res.status(500).json({ error: 'Failed to save mapping' });
  // }
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

// ---------- 5. Start server ------------------------------------------

app.get('*', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);


app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
