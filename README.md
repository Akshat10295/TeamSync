# TeamSync 🚀

Real-Time Collaboration Platform built for Student Teams.

## Tech Stack

- **Frontend** – React 19 (Vite) + Tailwind CSS v4 + Framer Motion
- **Backend** – Node.js, Express, Socket.io
- **Database & Auth** – Supabase (PostgreSQL + Auth + Storage)
- **Real-Time** – Socket.io for instant sync & presence tracking
- **Gamification** – XP system, leveling, and unlockable achievements

## Setup (5 minutes)

### Requirements
- Node.js v16+ (download from nodejs.org)
- A [Supabase](https://supabase.com) account & project

### Steps

```bash
# 1. Install backend dependencies
cd backend && npm install && cd ..

# 2. Install frontend dependencies
cd frontend && npm install && cd ..

# 3. Environment Configuration
# Create a .env file in the root directory:
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Create a .env file in the /frontend directory:
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3000

# 4. Database Setup
# Run schema.sql in Supabase SQL Editor (initial setup)
# Run migration-v2.sql (notifications + GitHub integration)
# Run migration-v3.sql (cloud storage + gamification)

# 5. Supabase Storage
# Go to Supabase Dashboard → Storage → Create Bucket
# Name: team-files  |  Public: false  |  Max size: 50MB

# 6. Start the backend
cd backend
npm start

# 7. Start the frontend (in a new terminal)
cd frontend
npm run dev
```

## Features

- ✅ **Authentication** – Secure Login / Register and Forgot Password flow via Supabase Auth.
- 👥 **Teams** – Create teams, invite members via code, manage permissions (Leader/Member).
- ✅ **Tasks** – Create, assign, track, start/stop timers, and mark complete. Team Leaders can extend task deadlines.
- 🎮 **Gamification** – XP system, leveling (every 200 XP), and 10 unique achievements with animated pop-up toasts.
- 📊 **Analytics** – Data visualization of completion rates, task status, and member workload.
- 📅 **Timeline** – Gantt-style visual task scheduling view.
- 📝 **Notes** – Collaborative notes with auto-save.
- ☁️ **Files** – Upload and manage team documents via Supabase Cloud Storage.
- 🔍 **Search** – Full-text search across tasks and notes.
- 🔔 **Notifications** – In-app real-time notification panel.
- 🔗 **GitHub Integration** – Browse team repositories and read files directly from the dashboard.
- ⚡ **Real-Time** – WebSocket sync + presence indicators powered by Socket.io.

## Project Structure

```
teamsync/
├── backend/            # Express + Socket.io backend API
│   ├── server.js       # Main server file
│   ├── schema.sql      # Initial database schema
│   ├── migration-v2.sql# Notifications + GitHub
│   ├── migration-v3.sql# Cloud storage + Gamification
│   ├── .env            # Backend environment variables
│   └── package.json    # Backend dependencies
├── frontend/           # React 19 (Vite) frontend (previously 'client')
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Auth, Dashboard
│   │   ├── lib/        # API, Supabase, Socket helpers
│   │   └── main.jsx    # Entry point
│   └── .env            # Frontend environment variables
└── README.md           # This file
```

## Real-Time Testing

Open the app in two different browser tabs (or standard/incognito), log in as two different users in the same team, and watch changes sync instantly between them!
