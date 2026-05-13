require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

let isConnected = false;
let connectionAttempted = false;

async function connectDB() {
  if (connectionAttempted && isConnected && mongoose.connection.readyState === 1) return;
  
  if (!connectionAttempted) {
    connectionAttempted = true;
    try {
      console.log('Attempting MongoDB connection...');
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      isConnected = true;
      console.log('✅ MongoDB connected successfully');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      console.log('⚠️  Server will continue without database (for testing)');
      isConnected = false;
    }
  }
}

// Connect on startup
connectDB();

app.use(async (req, res, next) => {
  if (!isConnected) {
    // Try to reconnect
    try {
      await connectDB();
    } catch (err) {
      // Continue without DB for now
    }
  }
  
  if (!isConnected && !req.path.includes('/health')) {
    return res.status(503).json({ 
      message: 'Database not connected. Please check MongoDB Atlas configuration.',
      hint: 'Make sure IP 0.0.0.0/0 is whitelisted in Network Access'
    });
  }
  next();
});

app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/messages'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    db: mongoose.connection.readyState,
    dbConnected: isConnected,
    message: isConnected ? 'Database connected' : 'Database not connected'
  });
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes for HTML pages
app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📱 Open http://localhost:${port} in your browser`);
  });
}

module.exports = app;
