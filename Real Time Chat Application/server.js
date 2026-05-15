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

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err.message));

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

// Helper: get DM room id (consistent regardless of who initiates)
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
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Users List ───────────────────────────────────────────────

// Get all users except self
app.get('/api/users', auth, async (req, res) => {
  try {
    const users = await User.find({ username: { $ne: req.user.username } })
      .select('username createdAt')
      .sort({ username: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Messages ─────────────────────────────────────────────────

// Get messages for a room (global or DM)
app.get('/api/messages', auth, async (req, res) => {
  try {
    const { with: withUser } = req.query;
    const room = withUser ? dmRoom(req.user.username, withUser) : 'global';

    const messages = await Message.find({ room })
      .sort({ createdAt: -1 })
      .limit(50);
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

    const message = await Message.create({
      sender: req.user.username,
      text: text.trim(),
      room
    });
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread count for each DM
app.get('/api/unread', auth, async (req, res) => {
  try {
    const users = await User.find({ username: { $ne: req.user.username } }).select('username');
    const unread = {};
    for (const u of users) {
      const room = dmRoom(req.user.username, u.username);
      const lastSeen = req.query['seen_' + u.username];
      if (lastSeen) {
        const count = await Message.countDocuments({
          room,
          sender: { $ne: req.user.username },
          createdAt: { $gt: new Date(lastSeen) }
        });
        unread[u.username] = count;
      }
    }
    res.json(unread);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Pages
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'public', 'chat.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));

module.exports = app;
