require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// DB connection cached for serverless warm instances
let isConnected = false;
async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGO_URI);
  isConnected = true;
}

// Ensure DB connected on every request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection failed:', err.message);
    res.status(500).json({ message: 'Database connection failed: ' + err.message });
  }
});

app.use(express.json());

// API routes BEFORE static files
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/messages'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState });
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Local dev only
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

module.exports = app;
