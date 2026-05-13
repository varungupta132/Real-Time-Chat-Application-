# 🚀 Deployment Guide - OrgChat on Vercel

## Prerequisites
- MongoDB Atlas account with cluster
- Vercel account
- Git repository (GitHub/GitLab)

## Step 1: MongoDB Atlas Setup

### 1.1 Network Access
1. Go to MongoDB Atlas Dashboard
2. Click **Network Access** (left sidebar)
3. Click **Add IP Address**
4. Select **Allow Access from Anywhere** (0.0.0.0/0)
5. Click **Confirm**
6. Wait 1-2 minutes for changes to apply

### 1.2 Database User
1. Go to **Database Access**
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Username: `guptavarun132_db_user` (or any name)
5. Password: Create a strong password (save it!)
6. Database User Privileges: **Read and write to any database**
7. Click **Add User**

### 1.3 Get Connection String
1. Go to **Database** → **Connect**
2. Choose **Drivers**
3. Copy the connection string
4. Replace `<password>` with your actual password
5. Add database name: `/chatapp` before the `?`

**Example:**
```
mongodb+srv://username:password@cluster000.qzhwqhg.mongodb.net/chatapp?retryWrites=true&w=majority
```

## Step 2: Push to GitHub

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - OrgChat application"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/orgchat.git

# Push
git push -u origin main
```

## Step 3: Deploy to Vercel

### Option A: Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Other
   - **Root Directory:** ./
   - **Build Command:** (leave empty)
   - **Output Directory:** (leave empty)

5. **Environment Variables** (IMPORTANT!):
   Click **Environment Variables** and add:
   
   ```
   MONGO_URI = mongodb+srv://username:password@cluster000.qzhwqhg.mongodb.net/chatapp?retryWrites=true&w=majority
   JWT_SECRET = your-super-secret-jwt-key-change-this
   NODE_ENV = production
   ```

6. Click **Deploy**
7. Wait 2-3 minutes
8. Your app will be live at: `https://your-project.vercel.app`

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts and add environment variables when asked

# For production
vercel --prod
```

## Step 4: Add Environment Variables (if not done)

1. Go to your project on Vercel
2. Click **Settings** → **Environment Variables**
3. Add these variables:

| Name | Value |
|------|-------|
| MONGO_URI | `mongodb+srv://...` (your full connection string) |
| JWT_SECRET | `your-secret-key-min-32-chars` |
| NODE_ENV | `production` |

4. Click **Save**
5. Redeploy: **Deployments** → **...** → **Redeploy**

## Step 5: Test Your Deployment

1. Open your Vercel URL: `https://your-project.vercel.app`
2. Register first user (will become admin)
3. Register second user
4. Login as admin
5. Approve second user
6. Test messaging

## Troubleshooting

### Issue: "Database connection failed"
**Solution:**
- Check MongoDB Atlas Network Access has 0.0.0.0/0
- Verify MONGO_URI in Vercel environment variables
- Check password doesn't have special characters (or URL encode them)

### Issue: "Cannot find module"
**Solution:**
- Make sure `package.json` has all dependencies
- Redeploy from Vercel dashboard

### Issue: "404 Not Found"
**Solution:**
- Check `vercel.json` is present
- Verify routes configuration

### Issue: Admin panel not showing
**Solution:**
- First user of each organization automatically becomes admin
- Clear browser localStorage and re-register

## Custom Domain (Optional)

1. Go to Vercel project → **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for DNS propagation (5-10 minutes)

## Environment Variables Reference

```env
# Required
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/chatapp?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Optional
NODE_ENV=production
PORT=3000
```

## Security Checklist

- ✅ MongoDB Network Access configured
- ✅ Strong database password
- ✅ JWT_SECRET is long and random
- ✅ Environment variables set in Vercel
- ✅ No sensitive data in code
- ✅ .env file in .gitignore

## Post-Deployment

### Monitor Your App
- Vercel Dashboard → Analytics
- Check function logs for errors
- Monitor MongoDB Atlas metrics

### Update Your App
```bash
# Make changes
git add .
git commit -m "Update message"
git push

# Vercel auto-deploys on push!
```

## URLs After Deployment

- **Production:** `https://your-project.vercel.app`
- **Login:** `https://your-project.vercel.app/`
- **Chat:** `https://your-project.vercel.app/chat`
- **API Health:** `https://your-project.vercel.app/api/health`

## Support

If you face issues:
1. Check Vercel function logs
2. Check MongoDB Atlas logs
3. Test API endpoints with Postman
4. Clear browser cache and localStorage

---

**Your app is now live! 🎉**

Share the URL with your organization members and start chatting!
