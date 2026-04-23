# Real Time Chat Application

A full-stack real-time chat app where two users can send and receive messages instantly — no page refresh, no delay.

Built with Node.js, Express, MongoDB, and Socket.io.

---

## Features

- Register and login with username and password
- See all registered users with online/offline status
- Real-time messaging using WebSockets (Socket.io)
- Typing indicator — see when the other person is typing
- Chat history saved in MongoDB — messages load when you come back
- JWT-based authentication — secure and stateless
- Passwords hashed with bcrypt — never stored in plain text

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Real-time | Socket.io |
| Auth | JWT, bcrypt |
| Frontend | HTML, CSS, Vanilla JS |

---

## Project Structure

```
Real Time Chat Application/
├── server.js
├── .env
├── models/
│   ├── User.js
│   └── Message.js
├── routes/
│   ├── auth.js
│   └── messages.js
├── middleware/
│   └── auth.js
└── public/
    ├── index.html
    ├── chat.html
    ├── chat.js
    └── style.css
```

---

## Getting Started

**1. Install dependencies**
```bash
npm install
```

**2. Set up `.env`**
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your_secret_key
```

**3. Run the server**
```bash
node server.js
```

**4. Open in browser**
```
http://localhost:3000
```

Open two browser tabs, register two different users, and start chatting in real time.

---

## How It Works

```
User logs in → gets JWT token
     ↓
Socket.io connects using that token
     ↓
User selects someone → old messages load from MongoDB
     ↓
User sends message → Socket.io delivers it instantly
     ↓
Message saved to MongoDB for history
```

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| GET | /api/users | Get all users (auth required) |
| GET | /api/messages/:userId | Get chat history (auth required) |
