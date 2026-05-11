const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

function signToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function userPayload(user) {
  return {
    id: user._id,
    name: user.name,
    username: user.username,
    role: user.role,
    department: user.department
  };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password, department } = req.body;

    if (!name || !username || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });

    if (username.length < 3)
      return res.status(400).json({ message: 'Username must be at least 3 characters' });

    if (password.length < 4)
      return res.status(400).json({ message: 'Password must be at least 4 characters' });

    const exists = await User.findOne({ $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] });
    if (exists) return res.status(400).json({ message: 'Username or email already taken' });

    // First registered user becomes admin (auto-approved)
    const isFirst = (await User.countDocuments()) === 0;

    const user = await User.create({
      name: name.trim(),
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password,
      department: department || 'General',
      role: isFirst ? 'admin' : 'employee',
      isApproved: isFirst
    });

    if (!isFirst) {
      return res.status(201).json({
        pending: true,
        message: 'Account created! Waiting for admin approval.'
      });
    }

    res.status(201).json({ token: signToken(user), user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Username and password required' });

    const user = await User.findOne({
      $or: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }]
    });

    if (!user || !(await user.matchPassword(password)))
      return res.status(400).json({ message: 'Invalid username or password' });

    if (!user.isApproved)
      return res.status(403).json({ message: 'Your account is pending admin approval' });

    await User.findByIdAndUpdate(user._id, { isOnline: true, lastSeen: new Date() });

    res.json({ token: signToken(user), user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      await User.findByIdAndUpdate(decoded.id, { isOnline: false, lastSeen: new Date() });
    }
  } catch {}
  res.json({ ok: true });
});

// GET /api/auth/setup  — creates admin account (safe: only works if no admin exists)
router.get('/setup', async (req, res) => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      return res.status(403).json({ message: 'Admin already exists. Use login.' });
    }

    const hashed = await bcrypt.hash('admin123', 10);
    await User.create({
      name: 'Admin',
      username: 'admin',
      email: 'admin@orgchat.com',
      password: hashed,
      role: 'admin',
      isApproved: true,
      department: 'General'
    });

    res.json({ message: 'Admin created! Login with username: admin | password: admin123' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
