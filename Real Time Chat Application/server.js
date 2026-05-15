require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';
const User = require('./models/User');
const Message = require('./models/Message');

// ── MongoDB Connection (cached for Vercel serverless) ────────
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Connect on every request (Vercel serverless needs this)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB Error:', err.message);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// ── Auth Middleware ──────────────────────────────────────────
function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

// Helper: consistent DM room id
function dmRoom(a, b) {
  return [a, b].sort().join('__');
}

// ── Auth Routes ──────────────────────────────────────────────

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Username and password required' });
    if (username.length < 3)
      return res.status(400).json({ message: 'Username must be at least 3 characters' });
    if (password.length < 4)
      return res.status(400).json({ message: 'Password must be at least 4 characters' });

    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ message: 'Username already taken' });

    const user = await User.create({ username, password });
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Invalid username or password' });

    const match = await user.matchPassword(password);
    if (!match) return res.status(400).json({ message: 'Invalid username or password' });

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Users ────────────────────────────────────────────────────

app.get('/api/users', auth, async (req, res) => {
  try {
    const users = await User.find({ username: { $ne: req.user.username } })
      .select('username')
      .sort({ username: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Messages ─────────────────────────────────────────────────

// Get messages (global or DM)
app.get('/api/messages', auth, async (req, res) => {
  try {
    const { with: withUser } = req.query;
    const room = withUser ? dmRoom(req.user.username, withUser) : 'global';
    const messages = await Message.find({ room }).sort({ createdAt: -1 }).limit(50);
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Poll new messages since timestamp
app.get('/api/messages/poll', auth, async (req, res) => {
  try {
    const { since, with: withUser } = req.query;
    const room = withUser ? dmRoom(req.user.username, withUser) : 'global';
    const query = { room };
    if (since) query.createdAt = { $gt: new Date(since) };
    const messages = await Message.find(query).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message
app.post('/api/messages', auth, async (req, res) => {
  try {
    const { text, to } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Message cannot be empty' });
    const room = to ? dmRoom(req.user.username, to) : 'global';
    const message = await Message.create({ sender: req.user.username, text: text.trim(), room });
    res.json(message);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Pages ────────────────────────────────────────────────────
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'public', 'chat.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── Start (local only, not Vercel) ───────────────────────────
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
}

module.exports = app;
