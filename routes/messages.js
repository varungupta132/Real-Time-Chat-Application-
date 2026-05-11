const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

// ── Users ─────────────────────────────────────────────────────────────────────

// GET /api/users — all approved users except self
router.get('/users', auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id }, isApproved: true })
      .select('-password')
      .sort({ isOnline: -1, name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/profile — current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Admin ─────────────────────────────────────────────────────────────────────

// GET /api/admin/pending
router.get('/admin/pending', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const users = await User.find({ isApproved: false }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/approve/:id
router.post('/admin/approve/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const user = await User.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/reject/:id
router.delete('/admin/reject/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/users — all users (admin only)
router.get('/admin/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Direct Messages ───────────────────────────────────────────────────────────

// GET /api/messages/:userId — DM history
router.get('/messages/:userId', auth, async (req, res) => {
  try {
    const roomId = [req.user.id, req.params.userId].sort().join('_');
    const messages = await Message.find({ roomId, type: 'dm' })
      .populate('sender', 'name username department')
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/messages — send DM
router.post('/messages', auth, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content?.trim())
      return res.status(400).json({ message: 'receiverId and content are required' });

    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ message: 'Receiver not found' });

    const roomId = [req.user.id, receiverId].sort().join('_');
    const message = await Message.create({
      sender: req.user.id,
      receiver: receiverId,
      content: content.trim(),
      type: 'dm',
      roomId
    });
    await message.populate('sender', 'name username department');
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/messages/:userId/poll — new DMs since timestamp
router.get('/messages/:userId/poll', auth, async (req, res) => {
  try {
    const roomId = [req.user.id, req.params.userId].sort().join('_');
    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    const messages = await Message.find({ roomId, type: 'dm', createdAt: { $gt: since } })
      .populate('sender', 'name username department')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Channels ──────────────────────────────────────────────────────────────────

// GET /api/channel/:name — channel history
router.get('/channel/:name', auth, async (req, res) => {
  try {
    const roomId = 'channel_' + req.params.name;
    const messages = await Message.find({ roomId, type: 'channel' })
      .populate('sender', 'name username department')
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/channel/:name — send channel message
router.post('/channel/:name', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Content is required' });

    const roomId = 'channel_' + req.params.name;
    const message = await Message.create({
      sender: req.user.id,
      channel: req.params.name,
      content: content.trim(),
      type: 'channel',
      roomId
    });
    await message.populate('sender', 'name username department');
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/channel/:name/poll — new channel messages since timestamp
router.get('/channel/:name/poll', auth, async (req, res) => {
  try {
    const roomId = 'channel_' + req.params.name;
    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    const messages = await Message.find({ roomId, type: 'channel', createdAt: { $gt: since } })
      .populate('sender', 'name username department')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Status ────────────────────────────────────────────────────────────────────

// POST /api/status
router.post('/status', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      isOnline: req.body.isOnline,
      lastSeen: new Date()
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
