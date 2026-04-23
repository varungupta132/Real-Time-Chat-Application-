const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all users except self
router.get('/users', auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get messages between two users
router.get('/messages/:userId', auth, async (req, res) => {
  try {
    const roomId = [req.user.id, req.params.userId].sort().join('_');
    const messages = await Message.find({ roomId })
      .populate('sender receiver', 'username')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send a message
router.post('/messages', auth, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content?.trim()) return res.status(400).json({ message: 'Missing fields' });

    const roomId = [req.user.id, receiverId].sort().join('_');
    const message = await Message.create({
      sender: req.user.id,
      receiver: receiverId,
      content: content.trim(),
      roomId
    });
    await message.populate('sender receiver', 'username');
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Poll for new messages since a timestamp
router.get('/messages/:userId/poll', auth, async (req, res) => {
  try {
    const roomId = [req.user.id, req.params.userId].sort().join('_');
    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    const messages = await Message.find({ roomId, createdAt: { $gt: since } })
      .populate('sender receiver', 'username')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update online status
router.post('/status', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { isOnline: req.body.isOnline });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
