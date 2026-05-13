# 🚀 OrgChat - Organizational Chat Application

A beautiful, real-time organizational chat application built with Node.js, Express, MongoDB, and vanilla JavaScript. Features include organization-based access control, admin approval system, direct messaging, and department channels.

## ✨ Features

### 🔐 Authentication & Authorization
- **Organization-based registration** - Users register with their organization name
- **Admin approval system** - First user becomes admin, subsequent users need approval
- **Secure JWT authentication**
- **Role-based access control** (Admin/User)

### 💬 Messaging
- **Direct Messages** - Private 1-on-1 conversations with team members
- **Department Channels** - Public channels for each department
- **Real-time updates** - Messages update automatically every 2 seconds
- **Online status indicators** - See who's online in real-time

### 👥 User Management
- **User directory** - View all approved users in your organization
- **Search functionality** - Quickly find team members
- **Department organization** - Users organized by departments
- **Profile information** - Name, email, department, and online status

### ⚙️ Admin Panel
- **Pending approvals** - View all users waiting for approval
- **Approve/Reject users** - One-click approval or rejection
- **Real-time badge** - Shows count of pending approvals
- **Organization management** - Manage all users in your organization

### 🎨 Beautiful UI
- **Slack-inspired design** - Modern, professional interface
- **Gradient colors** - Beautiful purple gradient theme
- **Responsive layout** - Works on desktop and mobile
- **User avatars** - Color-coded initials for each user
- **Smooth animations** - Polished user experience

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: bcryptjs
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Deployment**: Vercel-ready

## 📦 Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd chat-app
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

1. **Install Vercel CLI** (if not already installed)
```bash
npm i -g vercel
```

2. **Deploy**
```bash
vercel
```

3. **Set environment variables in Vercel**
- Go to your project settings on Vercel
- Add `MONGO_URI` and `JWT_SECRET` in Environment Variables

## 📖 Usage Guide

### First Time Setup

1. **Register as First User**
   - Go to the registration page
   - Enter your details with your organization name (e.g., "GLA University")
   - Select your department
   - You'll be automatically approved as the **Admin**

2. **Admin Responsibilities**
   - Check the Admin Panel regularly for pending approvals
   - Approve or reject new user requests
   - Manage organization members

### For Regular Users

1. **Register**
   - Fill in the registration form
   - Use the **exact same organization name** as your admin
   - Wait for admin approval

2. **After Approval**
   - Login with your credentials
   - Browse department channels
   - Start direct messages with team members
   - Update your online status automatically

### Messaging

**Channels:**
- Click on any department channel (e.g., #engineering)
- Send messages visible to all organization members
- See who sent each message with their department

**Direct Messages:**
- Click on any user in the Direct Messages section
- Have private conversations
- See online/offline status
- Search for users using the search box

## 🏗️ Project Structure

```
chat-app/
├── models/
│   ├── User.js          # User schema with organization & approval
│   └── Message.js       # Message schema for DMs and channels
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── admin.js         # Admin panel routes
│   └── messages.js      # Messaging routes
├── middleware/
│   └── auth.js          # JWT verification middleware
├── public/
│   ├── index.html       # Login/Register page
│   ├── chat.html        # Main chat interface
│   ├── chat.js          # Frontend JavaScript
│   └── style.css        # Styles
├── server.js            # Express server setup
├── vercel.json          # Vercel configuration
├── package.json         # Dependencies
└── .env                 # Environment variables
```

## 🔑 Key Features Explained

### Organization-Based Access
- Users can only see and message people in their organization
- Each organization is isolated from others
- First user of an organization becomes admin automatically

### Admin Approval Flow
1. User registers → Status: "pending"
2. Admin sees request in Admin Panel
3. Admin approves → User can login
4. Admin rejects → User cannot access

### Real-time Updates
- Messages poll every 2 seconds for new content
- User list updates every 15 seconds
- Online status updates on login/logout
- Pending approvals update in real-time

## 🎨 Departments

Pre-configured departments:
- General
- Engineering
- Design
- Marketing
- Sales
- HR
- Finance
- Operations

Each department has its own channel for team communication.

## 🔒 Security Features

- Passwords hashed with bcryptjs
- JWT tokens for authentication
- Protected routes with middleware
- Organization-based data isolation
- Input validation and sanitization
- XSS protection with HTML escaping

## 🐛 Troubleshooting

**Admin can't see pending users:**
- Make sure you're logged in as admin (first user of organization)
- Check that new users used the exact same organization name
- Refresh the admin panel

**Messages not updating:**
- Check your internet connection
- Ensure MongoDB is connected
- Check browser console for errors

**Can't login after registration:**
- If you're not the first user, wait for admin approval
- Check that you're using correct credentials
- Verify your account status with admin

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/logout` - Logout user

### Admin
- `GET /api/admin/pending` - Get pending users
- `POST /api/admin/approve/:userId` - Approve user
- `DELETE /api/admin/reject/:userId` - Reject user

### Messaging
- `GET /api/users` - Get all users in organization
- `POST /api/messages` - Send direct message
- `GET /api/messages/:userId` - Get DM history
- `POST /api/channel/:channelName` - Send channel message
- `GET /api/channel/:channelName` - Get channel messages

## 🤝 Contributing

Feel free to fork this project and submit pull requests!

## 📄 License

MIT License - feel free to use this project for learning or production!

## 👨‍💻 Author

Built with ❤️ for organizational communication

---

**Happy Chatting! 💬**
