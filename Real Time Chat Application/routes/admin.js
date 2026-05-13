const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify admin
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.role !== 'admin' || user.status !== 'approved') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get pending users for admin's organization
router.get('/pending', verifyAdmin, async (req, res) => {
  try {
    const pendingUsers = await User.find({
      organization: req.user.organization,
      status: 'pending'
    }).select('-password').sort({ createdAt: -1 });

    res.json(pendingUsers);
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve user
router.post('/approve/:userId', verifyAdmin, async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.userId,
      organization: req.user.organization,
      status: 'pending'
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found or already processed' });
    }

    user.status = 'approved';
    await user.save();

    res.json({ message: 'User approved successfully', user: { id: user._id, name: user.name } });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject user
router.delete('/reject/:userId', verifyAdmin, async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.userId,
      organization: req.user.organization,
      status: 'pending'
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found or already processed' });
    }

    user.status = 'rejected';
    await user.save();

    res.json({ message: 'User rejected successfully' });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all approved users in organization
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({
      organization: req.user.organization,
      status: 'approved'
    }).select('-password').sort({ name: 1 });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
