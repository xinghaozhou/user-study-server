/* ───────────── server/index.js ───────────── */
console.log('🔑 REDIS_URL =', process.env.REDIS_URL || 'NOT SET');
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { createClient } = require('redis');

const app  = express();
const PORT = process.env.PORT || 3001;

// —— CORS middleware —— //
const allowList = [
  'http://localhost:5173',
  'https://user-study-server.vercel.app',                     // Prod
  'https://user-study-server-production.up.railway.app'       // Backend self
];

const vercelPreviewRE = /^https:\/\/user-study-server-git-.*\.vercel\.app$/;

app.use('/api', cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);                    // curl / health
    if (allowList.includes(origin) || vercelPreviewRE.test(origin))
      return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
}));

app.use('/api', cors(corsOptions));         
app.options('/api/*', cors(corsOptions));


app.use(express.json());   

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

/* ===== POST /api/saveMapping =====
   Body: { userId: "user01", mapping: [...], timestamp?: ISOString }
*/
app.post('/api/saveMapping', async (req, res) => {
  const { userId, mapping, timestamp = new Date().toISOString() } = req.body;

  if (!userId || !mapping) {
    return res.status(400).json({ error: 'Missing userId or mapping' });
  }

  try {
    await redis.set(`mapping:${userId}`, JSON.stringify({ mapping, timestamp }));
    console.log('✅ Saved mapping for', userId);
    res.status(200).json({ message: 'Mapping saved to Redis' });
  } catch (err) {
    console.error('❌ Redis save error:', err);
    res.status(500).json({ error: 'Failed to save mapping' });
  }
});

/* ===== GET /api/getMapping?userId=user01 =====
*/
app.get('/api/getMapping', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId query param' });

  try {
    const raw  = await redis.get(`mapping:${userId}`);
    const data = raw ? JSON.parse(raw) : null;
    res.json({ userId, data });
  } catch (err) {
    console.error('❌ Redis read error:', err);
    res.status(500).json({ error: 'Failed to retrieve mapping' });
  }
});

app.get('/api/health', (req, res) => res.send('OK'));

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/user',   express.static(path.join(__dirname, 'public/user_data')));

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
/* ─────────────────────────────────────────── */
