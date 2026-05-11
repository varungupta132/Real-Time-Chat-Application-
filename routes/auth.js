const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password, department } = req.body;
    if (!name || !username || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });

    if (await User.findOne({ $or: [{ username }, { email }] }))
      return res.status(400).json({ message: 'Username or email already exists' });

    // First user becomes admin and is auto-approved
    const count = await User.countDocuments();
    const isFirst = count === 0;

    const user = await User.create({
      name, username, email, password,
      department: department || 'General',
      role: isFirst ? 'admin' : 'employee',
      isApproved: isFirst ? true : false
    });

    if (!isFirst) {
      return res.json({ pending: true, message: 'Registration successful! Waiting for admin approval.' });
    }

    res.json({ token: signToken(user), user: { id: user._id, name: user.name, username: user.username, role: user.role, department: user.department } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ $or: [{ username }, { email: username }] });

    if (!user || !(await user.matchPassword(password)))
      return res.status(400).json({ message: 'Invalid credentials' });

    if (!user.isApproved)
      return res.status(403).json({ message: 'Your account is pending admin approval' });

    await User.findByIdAndUpdate(user._id, { isOnline: true, lastSeen: new Date() });

    res.json({
      token: signToken(user),
      user: { id: user._id, name: user.name, username: user.username, role: user.role, department: user.department }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// One-time setup: creates admin/admin if not exists, resets password if exists
router.get('/setup', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash('admin', 10);

    const existing = await User.findOne({ username: 'admin' });
    if (existing) {
      await User.findOneAndUpdate(
        { username: 'admin' },
        { role: 'admin', isApproved: true, password: hashed }
      );
      return res.json({ message: 'Admin password reset to: admin' });
    }

    await User.create({
      name: 'Admin',
      username: 'admin',
      email: 'admin@orgchat.com',
      password: hashed,
      role: 'admin',
      isApproved: true,
      department: 'General'
    });
    res.json({ message: 'Admin created! Username: admin, Password: admin' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      await User.findByIdAndUpdate(decoded.id, { isOnline: false, lastSeen: new Date() });
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

module.exports = router;
