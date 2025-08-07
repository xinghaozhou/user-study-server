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
app.use('/user', express.static(path.join(__dirname, 'public/user_data')));

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
app.post('/api/saveMapping', async (req, res) => {
  const { userId, mapping, timestamp = new Date().toISOString() } = req.body;
  if (!userId || !mapping)
    return res.status(400).json({ error: 'Missing userId or mapping' });

  const key = `mapping:${userId}`;
  try{
    const setRes = await redis.set(
      key,
      JSON.stringify({mapping, savedAt: Data.now()}),
      { NX: true, EX: 60 * 60}
    );

    if(setRes == null){
      const cached = await redis.get(key);
      console.log("Reusing cache mapping for", userId)
      return res.json({status: 'cached', data: JSON.parse});
    }

    console.log('Saved mapping for', userId);
    return res.json({status: 'saved', data: {mapping }});
  }catch(err){
    console.error('Redis error:', err);
    return res.status(500).json({eoor: 'Redis failure'});
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
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
