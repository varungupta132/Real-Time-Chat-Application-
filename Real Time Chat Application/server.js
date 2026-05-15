require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';
const User = require('./models/User');
const Message = require('./models/Message');

// ── Serve HTML FIRST (before DB middleware) ──────────────────
const indexHTML = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));
const chatHTML  = fs.readFileSync(path.join(__dirname, 'public', 'chat.html'));

app.get('/',     (req, res) => res.setHeader('Content-Type', 'text/html').end(indexHTML));
app.get('/chat', (req, res) => res.setHeader('Content-Type', 'text/html').end(chatHTML));

// ── MongoDB (cached for Vercel serverless) ───────────────────
let cached = global.mongoose || { conn: null, promise: null };
global.mongoose = cached;

async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) return;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    }).then(m => { cached.conn = m; return m; });
  }
  await cached.promise;
}

app.use(async (req, res, next) => {
  try { await connectDB(); next(); }
  catch (e) { res.status(500).json({ message: 'DB failed', error: e.message }); }
});

// ── Auth Middleware ──────────────────────────────────────────
function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ message: 'Invalid token' }); }
}

function dmRoom(a, b) { return [a, b].sort().join('__'); }

// ── API Routes ───────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' });
    if (username.length < 3) return res.status(400).json({ message: 'Username must be at least 3 characters' });
    if (password.length < 4) return res.status(400).json({ message: 'Password must be at least 4 characters' });
    if (await User.findOne({ username })) return res.status(400).json({ message: 'Username already taken' });
    const user = await User.create({ username, password });
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username });
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await user.matchPassword(password)))
      return res.status(400).json({ message: 'Invalid username or password' });
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username });
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

app.get('/api/users', auth, async (req, res) => {
  try {
    const users = await User.find({ username: { $ne: req.user.username } }).select('username').sort({ username: 1 });
    res.json(users);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

app.get('/api/messages', auth, async (req, res) => {
  try {
    const room = req.query.with ? dmRoom(req.user.username, req.query.with) : 'global';
    const msgs = await Message.find({ room }).sort({ createdAt: -1 }).limit(50);
    res.json(msgs.reverse());
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

app.get('/api/messages/poll', auth, async (req, res) => {
  try {
    const room = req.query.with ? dmRoom(req.user.username, req.query.with) : 'global';
    const query = { room };
    if (req.query.since) query.createdAt = { $gt: new Date(req.query.since) };
    res.json(await Message.find(query).sort({ createdAt: 1 }));
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

app.post('/api/messages', auth, async (req, res) => {
  try {
    const { text, to } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Message cannot be empty' });
    const room = to ? dmRoom(req.user.username, to) : 'global';
    const msg = await Message.create({ sender: req.user.username, text: text.trim(), room });
    res.json(msg);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

// ── Local dev ────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
}

module.exports = app;
