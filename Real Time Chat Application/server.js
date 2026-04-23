require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');

const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' },
  transports: ['polling', 'websocket']
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/messages'));

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Track online users: { userId -> socketId }
const onlineUsers = {};

// Socket.io auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('No token'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', async (socket) => {
  const { id: userId, username } = socket.user;

  onlineUsers[userId] = socket.id;
  await User.findByIdAndUpdate(userId, { isOnline: true });
  io.emit('user_online', { userId });

  socket.on('send_message', async ({ receiverId, content }) => {
    if (!content?.trim()) return;

    const roomId = [userId, receiverId].sort().join('_');
    const message = await Message.create({
      sender: userId,
      receiver: receiverId,
      content: content.trim(),
      roomId
    });

    await message.populate('sender receiver', 'username');

    // Send to receiver if online, always echo back to sender
    if (onlineUsers[receiverId]) {
      io.to(onlineUsers[receiverId]).emit('new_message', message);
    }
    socket.emit('new_message', message);
  });

  socket.on('typing', ({ receiverId, isTyping }) => {
    if (onlineUsers[receiverId]) {
      io.to(onlineUsers[receiverId]).emit('typing', { senderId: userId, isTyping });
    }
  });

  socket.on('disconnect', async () => {
    delete onlineUsers[userId];
    await User.findByIdAndUpdate(userId, { isOnline: false });
    io.emit('user_offline', { userId });
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    const port = process.env.PORT || 3000;
    server.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch(err => console.error('MongoDB error:', err.message));
