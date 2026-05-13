const express = require('express');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify user
const verifyUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.status !== 'approved') {
      return res.status(403).json({ message: 'Access denied' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get all users in same organization
router.get('/users', verifyUser, async (req, res) => {
  try {
    const users = await User.find({
      organization: req.user.organization,
      status: 'approved',
      _id: { $ne: req.user._id }
    }).select('-password').sort({ name: 1 });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update online status
router.post('/status', verifyUser, async (req, res) => {
  try {
    const { isOnline } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      isOnline,
      lastSeen: new Date()
    });
    res.json({ message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Send direct message
router.post('/messages', verifyUser, async (req, res) => {
  try {
    const { receiverId, content } = req.body;

    // Verify receiver is in same organization
    const receiver = await User.findOne({
      _id: receiverId,
      organization: req.user.organization,
      status: 'approved'
    });

    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    const message = new Message({
      sender: req.user._id,
      receiver: receiverId,
      content,
      organization: req.user.organization
    });

    await message.save();
    await message.populate('sender', 'username name department');

    res.json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get direct messages with a user
router.get('/messages/:userId', verifyUser, async (req, res) => {
  try {
    const { userId } = req.params;

    const messages = await Message.find({
      organization: req.user.organization,
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ]
    })
      .populate('sender', 'username name department')
      .sort({ createdAt: 1 })
      .limit(100);

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Poll for new messages
router.get('/messages/:userId/poll', verifyUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const { since } = req.query;

    const query = {
      organization: req.user.organization,
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ]
    };

    if (since) {
      query.createdAt = { $gt: new Date(since) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'username name department')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Poll messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send channel message
router.post('/channel/:channelName', verifyUser, async (req, res) => {
  try {
    const { channelName } = req.params;
    const { content } = req.body;

    const message = new Message({
      sender: req.user._id,
      content,
      channel: channelName,
      organization: req.user.organization
    });

    await message.save();
    await message.populate('sender', 'username name department');

    res.json(message);
  } catch (error) {
    console.error('Send channel message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get channel messages
router.get('/channel/:channelName', verifyUser, async (req, res) => {
  try {
    const { channelName } = req.params;

    const messages = await Message.find({
      channel: channelName,
      organization: req.user.organization
    })
      .populate('sender', 'username name department')
      .sort({ createdAt: 1 })
      .limit(100);

    res.json(messages);
  } catch (error) {
    console.error('Get channel messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Poll channel messages
router.get('/channel/:channelName/poll', verifyUser, async (req, res) => {
  try {
    const { channelName } = req.params;
    const { since } = req.query;

    const query = {
      channel: channelName,
      organization: req.user.organization
    };

    if (since) {
      query.createdAt = { $gt: new Date(since) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'username name department')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Poll channel messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
