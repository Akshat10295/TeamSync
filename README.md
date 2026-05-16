# 🚀 TeamSync IDE

**TeamSync** is a high-performance, production-ready collaborative IDE built for distributed teams. It features real-time code synchronization, an interactive collaborative terminal, and a sandboxed execution engine—all orchestrated via Docker.

## ✨ Features

- **Real-time Collaboration**: Powered by Yjs and Socket.io for low-latency code syncing.
- **Interactive Collaborative Terminal**: A shared `xterm.js` shell allowing multiple users to run commands in a secure, isolated Alpine Linux environment.
- **Sandboxed Code Execution**: Support for Python, JavaScript, Java (Amazon Corretto), and C++ with direct container injection for maximum reliability.
- **Scalable Architecture**: Stateless backend with Redis Pub/Sub for horizontal scaling and Nginx load balancing.
- **Project Analytics**: Real-time insights into team productivity and task distribution.
- **GitHub Integration**: Link repositories and browse code directly within the IDE.

## 🛠️ Technology Stack

- **Frontend**: React 19, Framer Motion, Lucide, Xterm.js
- **Backend**: Node.js 20, Socket.io, Express
- **Database**: Supabase (PostgreSQL + Auth)
- **Infrastructure**: Redis, Nginx, Docker, Docker Compose
- **Sandboxing**: Dockerode (Docker API for Node.js)

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Desktop
- Node.js 20+
- A Supabase Project (URL and Anon Key)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Akshat10295/TeamSync.git
   cd TeamSync
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the `backend/` directory:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   REDIS_URL=redis://redis:6379
   ```

3. **Run with Docker Compose**:
   ```bash
   docker-compose up --build
   ```

4. **Access the Application**:
   - **IDE/Dashboard**: [http://localhost:8080](http://localhost:8080)
   - **Backend API**: [http://localhost:3000](http://localhost:3000)

## 🏗️ Architecture

TeamSync uses a distributed architecture to ensure high availability and performance:

- **Nginx (Reverse Proxy)**: Manages incoming traffic and routes it to the frontend or API services.
- **Redis (Backplane)**: Syncs Socket.io events across multiple API instances, enabling horizontal scaling.
- **Execution Engine**: Spawns ephemeral, resource-constrained Docker containers for every code run to ensure user isolation and security.

## 📄 License
MIT License - Developed by Akshat and the TeamSync Team.
