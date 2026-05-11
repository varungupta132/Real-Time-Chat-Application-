const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all approved users except self
router.get('/users', auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id }, isApproved: true }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get pending users (admin only)
router.get('/admin/pending', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const users = await User.find({ isApproved: false }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Approve user (admin only)
router.post('/admin/approve/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    await User.findByIdAndUpdate(req.params.id, { isApproved: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reject/delete user (admin only)
router.delete('/admin/reject/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get DM history
router.get('/messages/:userId', auth, async (req, res) => {
  try {
    const roomId = [req.user.id, req.params.userId].sort().join('_');
    const messages = await Message.find({ roomId, type: 'dm' })
      .populate('sender', 'name username')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send DM
router.post('/messages', auth, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content?.trim()) return res.status(400).json({ message: 'Missing fields' });
    const roomId = [req.user.id, receiverId].sort().join('_');
    const message = await Message.create({ sender: req.user.id, receiver: receiverId, content: content.trim(), type: 'dm', roomId });
    await message.populate('sender', 'name username');
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Poll new DMs
router.get('/messages/:userId/poll', auth, async (req, res) => {
  try {
    const roomId = [req.user.id, req.params.userId].sort().join('_');
    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    const messages = await Message.find({ roomId, type: 'dm', createdAt: { $gt: since } })
      .populate('sender', 'name username')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get channel messages
router.get('/channel/:name', auth, async (req, res) => {
  try {
    const messages = await Message.find({ channel: req.params.name, type: 'channel' })
      .populate('sender', 'name username department')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send channel message
router.post('/channel/:name', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Missing content' });
    const roomId = 'channel_' + req.params.name;
    const message = await Message.create({ sender: req.user.id, channel: req.params.name, content: content.trim(), type: 'channel', roomId });
    await message.populate('sender', 'name username department');
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Poll channel messages
router.get('/channel/:name/poll', auth, async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    const messages = await Message.find({ channel: req.params.name, type: 'channel', createdAt: { $gt: since } })
      .populate('sender', 'name username department')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update online status
router.post('/status', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { isOnline: req.body.isOnline, lastSeen: new Date() });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
