# 💬 Real-Time Chat Application

A simple, beautiful real-time chat application built with Node.js, Express, MongoDB, and vanilla JavaScript. Features include global chat, direct messaging, and real-time updates.

## ✨ Features

- 🔐 **User Authentication** - Secure registration and login with JWT
- 💬 **Global Chat** - Public chat room for all users
- 📨 **Direct Messages** - Private 1-on-1 conversations
- 🔄 **Real-time Updates** - Messages update automatically via polling
- 👥 **User List** - See all registered users
- 🎨 **Modern UI** - Clean, responsive design with dark theme
- 🚀 **Serverless Ready** - Optimized for Vercel deployment

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: bcryptjs
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Deployment**: Vercel

## 📦 Installation

1. **Clone the repository**
```bash
git clone https://github.com/varungupta132/Real-Time-Chat-Application-.git
cd Real-Time-Chat-Application-
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key_here
PORT=3000
NODE_ENV=development
```

4. **Start the server**
```bash
npm start
```

5. **Open your browser**
```
http://localhost:3000
```

## 🚀 Deployment on Vercel

1. **Push to GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Deploy on Vercel**
- Go to [vercel.com](https://vercel.com)
- Import your GitHub repository
- Add environment variables:
  - `MONGO_URI`
  - `JWT_SECRET`
  - `NODE_ENV=production`
- Deploy!

## 📖 Usage

1. **Register** - Create a new account with username and password
2. **Login** - Sign in with your credentials
3. **Global Chat** - Start chatting with everyone in the global room
4. **Direct Messages** - Click on any user to start a private conversation
5. **Real-time** - Messages update automatically without refresh

## 🏗️ Project Structure

```
Real-Time-Chat-Application/
├── models/
│   ├── User.js          # User schema with password hashing
│   └── Message.js       # Message schema for chat
├── public/
│   ├── index.html       # Login/Register page
│   └── chat.html        # Main chat interface
├── server.js            # Express server with API routes
├── vercel.json          # Vercel deployment config
├── package.json         # Dependencies
├── .env                 # Environment variables (not in git)
└── .gitignore           # Git ignore rules
```

## 🔑 API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login user

### Users
- `GET /api/users` - Get all users (requires auth)

### Messages
- `GET /api/messages` - Get messages (global or DM)
- `GET /api/messages/poll` - Poll for new messages
- `POST /api/messages` - Send a message

## 🔒 Security Features

- Passwords hashed with bcryptjs
- JWT tokens for authentication
- Protected API routes
- Input validation
- XSS protection

## 🐛 Troubleshooting

**Can't connect to MongoDB:**
- Check your `MONGO_URI` in environment variables
- Ensure MongoDB Atlas allows connections from your IP

**Messages not updating:**
- Check browser console for errors
- Verify JWT token is valid
- Check network tab for API calls

**Deployment issues:**
- Ensure all environment variables are set in Vercel
- Check Vercel deployment logs
- Verify `vercel.json` configuration

## 📝 License

MIT License - feel free to use this project!

## 👨‍💻 Author

Built by Varun Gupta

---

**Happy Chatting! 💬**
