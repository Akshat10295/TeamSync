# TeamSync IDE – Distributed Real-Time Collaborative Development Platform

## 1. System Architecture Plan

To transform TeamSync into a production-grade collaborative IDE, we must transition from a simple client-server model to a **distributed, event-driven architecture**. 

### High-Level Architecture
* **Frontend Layer**: React 19 + Vite. Handles UI, Monaco Editor instances, Yjs CRDT providers, and WebRTC for P2P connections (if needed for voice/video).
* **API Gateway & Load Balancer**: Nginx or HAProxy. Routes REST requests to stateless API servers and WebSocket connections to Stateful Socket Servers.
* **Stateless API Services (Node.js/Express)**: Handles Auth, CRUD operations (Projects, Users, Repos), and interfaces with Supabase.
* **Stateful Collaboration Servers (Node.js/Socket.io/Yjs)**: Maintains active document states in-memory. Uses **Redis Pub/Sub** to synchronize events across multiple collaboration server instances.
* **Execution Engine (Docker/Go or Node.js)**: A separate, highly isolated worker pool. Receives code execution requests via message queues (e.g., RabbitMQ or Redis List), spins up ephemeral Docker containers, executes code, and returns the output.
* **Data Persistence**:
  * **Supabase PostgreSQL**: Persistent storage for users, projects, metadata, and final document states.
  * **Redis**: Session management, WebSocket pub/sub backplane, caching frequently accessed data, and rate limiting.
  * **S3/Supabase Storage**: User avatars, project assets, and potentially compiled artifact storage.

```mermaid
graph TD
    Client[Client App (React/Vite/Yjs)] --> LB[API Gateway / Load Balancer]
    LB --> API[Stateless API Servers]
    LB --> WS[Stateful Collab Servers]
    
    API --> DB[(Supabase PostgreSQL)]
    API --> Cache[(Redis Cache)]
    
    WS --> RedisPubSub[(Redis Pub/Sub Backplane)]
    WS --> DB
    
    API -- "Execute Code Task" --> MQ[Message Queue (RabbitMQ)]
    MQ --> ExecWorker[Execution Worker Pool]
    ExecWorker -- "Spawns" --> Docker[Isolated Docker Containers]
    ExecWorker -- "Result" --> API
```

---

## 2. Folder Structure

### Frontend Structure (Monorepo/Frontend)
```text
frontend/
├── src/
│   ├── assets/           # Static assets, icons
│   ├── components/       # Reusable UI (Buttons, Modals)
│   ├── features/         # Feature-based modules (Domain-Driven)
│   │   ├── editor/       # Monaco wrapper, Yjs bindings, syntax highlighters
│   │   ├── terminal/     # Xterm.js integration, SSH/Socket logic
│   │   ├── chat/         # Real-time team chat, WebRTC signaling
│   │   ├── git/          # Git tree visualization, PR overview
│   │   └── dashboard/    # Project list, analytics
│   ├── hooks/            # Custom React hooks (useYjs, useSocket, useAuth)
│   ├── services/         # API clients, WebSocket managers
│   ├── store/            # Global state (Zustand or Redux)
│   ├── utils/            # Helpers (CRDT resolvers, formatting)
│   ├── pages/            # Route components
│   └── App.tsx           # Main entry, Router
```

### Backend Structure (Monorepo/Backend)
```text
backend/
├── src/
│   ├── api/              # REST controllers, routes, middlewares
│   ├── config/           # Environment, DB, Redis configurations
│   ├── services/         # Business logic (AuthService, ProjectService)
│   ├── sockets/          # Socket.io event handlers, namespace routing
│   ├── collaboration/    # Yjs document managers, awareness handlers
│   ├── execution/        # Docker interaction logic, sandbox managers
│   ├── utils/            # Loggers, error handlers
│   └── index.js          # Entry point
├── Dockerfile            # API Server Dockerfile
└── docker-compose.yml    # Local dev orchestration (Redis, API, Worker)
```

---

## 3. Database Schema Design (PostgreSQL)

* **Users**: `id` (UUID), `email`, `name`, `avatar_url`, `created_at`
* **Projects/Workspaces**: `id`, `name`, `owner_id`, `description`, `created_at`
* **Project_Members (RBAC)**: `project_id`, `user_id`, `role` (admin, editor, viewer), `joined_at`
* **Files/Documents**: `id`, `project_id`, `parent_id` (for folders), `name`, `type` (file/folder), `content_snapshot` (Bytea/Text), `updated_at`
* **Execution_Logs**: `id`, `project_id`, `user_id`, `language`, `status`, `execution_time`, `created_at`
* **Chat_Messages**: `id`, `project_id`, `user_id`, `content`, `timestamp`

---

## 4. Recommended APIs and Libraries

* **Frontend**:
  * `monaco-editor`: Core code editor.
  * `yjs`, `y-monaco`, `y-websocket`: CRDT implementation for collaborative editing.
  * `xterm.js`: For the collaborative terminal feature.
  * `zustand`: Lightweight global state management.
  * `react-query`: Server state caching and REST API data fetching.
* **Backend**:
  * `express` & `socket.io`: API and WebSockets.
  * `@socket.io/redis-adapter`: For scaling WebSockets across multiple instances.
  * `dockerode`: Node.js library to programmatically interact with the Docker Daemon.
  * `yjs` & `y-websocket`: To maintain the authoritative CRDT document state on the server.
  * `ioredis`: Redis client for caching and pub/sub.
  * `winston` or `pino`: Structured logging.

---

## 5. Step-by-Step Implementation Roadmap

1. **Phase 1: Foundation & Auth (Weeks 1-2)**
   * Set up monorepo and Docker Compose for local dev (PostgreSQL, Redis).
   * Refine Supabase Auth, implement RBAC middleware in Express.
2. **Phase 2: Collaborative Editor (Weeks 3-4)**
   * Integrate Monaco Editor.
   * Implement Yjs over WebSockets. Ensure conflict-free typing.
   * Add presence awareness (cursor tracking, user selection).
3. **Phase 3: File System & Workspace (Weeks 5-6)**
   * Build backend file tree APIs.
   * Create the IDE sidebar (create, rename, delete files) and sync state to DB.
4. **Phase 4: Remote Code Execution (Weeks 7-8)**
   * Set up the Execution Worker.
   * Use `dockerode` to spin up isolated containers based on language (Node, Python, C++, Java).
   * Stream `stdout`/`stderr` back to the client via WebSockets.
5. **Phase 5: Collaborative Terminal & Git (Weeks 9-10)**
   * Integrate `xterm.js`. Link it to a bash session inside a secure container.
   * Implement GitHub OAuth to pull repos and push commits via GitHub API.
6. **Phase 6: Polish & Deployment (Weeks 11-12)**
   * Setup Nginx Load Balancer, deploy to AWS/GCP.
   * Add Redis caching, optimize Docker image pulls.

---

## 6. System Design Explanation

### Distributed Synchronization (CRDTs over OT)
Why Yjs (CRDT) instead of Operational Transformation (OT - like Google Docs)? OT requires a central server to resolve conflicts, making offline editing or P2P complex. CRDTs (Conflict-free Replicated Data Types) mathematically guarantee that all clients converge to the same state regardless of the order they receive updates. This is crucial for a responsive IDE and heavily demonstrates distributed systems knowledge.

### Scalable Real-Time Architecture
A single Node.js server cannot handle thousands of active WebSocket connections while performing CRDT document syncing. We use a Load Balancer to distribute WebSocket connections across multiple Node instances. The **Redis Pub/Sub Backplane** acts as the message bus. If User A (on Server 1) types, Server 1 updates its Yjs state, and publishes the update to Redis. Server 2 receives it, updates its state, and broadcasts to User B.

---

## 7. WebSocket Event Architecture

* **Namespaces**: Use `/project/:projectId` to isolate socket traffic.
* **Events**:
  * `document:update`: Streams binary Yjs update arrays.
  * `awareness:update`: Streams cursor positions and selections.
  * `terminal:input` & `terminal:output`: Streams keystrokes and shell output.
  * `exec:start`, `exec:stdout`, `exec:stderr`, `exec:end`: Code execution lifecycle.
  * `chat:message`: Broadcasts team chat.

---

## 8. Docker Execution Architecture (Code Sandbox)

To prevent a user from running `rm -rf /` on your host server or mining crypto, we isolate execution:
1. Client sends source code to API.
2. API places code in a temporary volume/directory.
3. API spawns a Docker container (e.g., `docker run --rm -v /tmp/code:/app -m 128m --cpus=".5" --network none python:3.9 python /app/main.py`).
   * `--rm`: Auto-destroy container after execution.
   * `-m 128m --cpus=".5"`: Strict resource limits (Operating Systems concept).
   * `--network none`: Disables internet access so malicious code cannot download payloads or attack networks (Security concept).
4. API captures streams and sends back to client.
5. Timeout mechanism kills the container if execution exceeds 5 seconds.

---

## 9. Security Best Practices

* **Container Isolation**: As described above, dropping network privileges and bounding resources.
* **WebSocket Authentication**: Do not accept WS connections without a valid Supabase JWT token passed in the handshake.
* **RBAC Enforcement**: The backend must verify if a user has "editor" vs "viewer" privileges before applying their Yjs updates.
* **Input Sanitization**: Escape all chat inputs and terminal inputs to prevent XSS and command injection.
* **Rate Limiting**: Use Redis to limit the number of code executions per minute per user to prevent DoS attacks.

---

## 10. Scalability Improvements

* **Caching**: Cache file trees and read-heavy project metadata in Redis.
* **Statelessness**: Ensure the API layer stores absolutely no session data in memory.
* **Microservices**: As the app grows, decouple the "Code Execution Engine" into a separate Golang or Rust microservice that simply consumes a RabbitMQ queue.
* **Database Indexing**: Add B-Tree indexes on `project_id` and `user_id` to speed up relational queries.

---

## 11. GitHub README Structure

```markdown
# TeamSync IDE 🚀

TeamSync is a distributed, real-time collaborative development platform that brings the power of VS Code, the collaboration of Google Docs, and the community of Discord into a single, cloud-native application.

## System Architecture
[Insert High-Level Architecture Mermaid Diagram]

## Features
- **Real-Time Code Collaboration**: Powered by Yjs CRDTs for conflict-free multi-cursor editing.
- **Secure Code Execution**: Ephemeral Docker containers with CPU/Mem boundaries.
- **Collaborative Terminal**: xterm.js synced across clients via WebSockets.
- **GitHub Integration**: Manage branches and commits seamlessly.

## Tech Stack
- Frontend: React, Vite, Zustand, Tailwind, Monaco Editor
- Backend: Node.js, Express, Socket.io, Yjs, Dockerode
- Infra: PostgreSQL, Redis, Docker, Nginx
```

---

## 12. API Endpoint Structure (REST)

* `POST /api/v1/auth/login` (Handled by Supabase)
* `GET /api/v1/projects` - List user's projects
* `POST /api/v1/projects` - Create project
* `GET /api/v1/projects/:id/tree` - Get file system structure
* `POST /api/v1/projects/:id/files` - Create file
* `POST /api/v1/projects/:id/execute` - Trigger Docker execution (Returns Execution ID)
* `GET /api/v1/github/repos` - List linked repos

---

## 13. Best Practices for Production-Grade Coding

* **TypeScript**: Use strict TypeScript throughout the stack to catch interface errors at compile time.
* **Error Handling Middleware**: Centralize backend error handling. Never expose raw stack traces to the client.
* **Environment Variables**: Use `.env` files for secrets. Validate them on startup using a library like `zod` or `joi`.
* **CI/CD**: Set up GitHub Actions to run ESLint, Jest tests, and build Docker images on every PR.
* **Graceful Shutdown**: Intercept `SIGINT` and `SIGTERM` signals in Node.js to close DB connections and finish active Docker executions before the server exits.

---

## 14. Suggestions to "WOW" Recruiters

### Best Project Title
* **CodeSync – Distributed Real-Time Cloud IDE**
* **NexusIDE – Collaborative Cloud Development Environment**

### Best Resume Description
* "Architected a scalable, real-time cloud IDE enabling concurrent multi-user editing using **CRDTs (Yjs)** and WebSockets. Designed a secure, isolated code execution engine using programmatic **Docker** spawning with strict resource limits and network isolation. Scaled stateful WebSocket connections horizontally using a **Redis Pub/Sub** backplane, supporting real-time awareness and collaborative terminal sessions."

### Best Demo Flow for Interviews
1. **The Setup**: Open two browser windows side-by-side (logged in as different users).
2. **The Magic (Distributed Systems)**: Type code in Window A; watch the cursor and text instantly appear in Window B. Briefly mention CRDTs preventing conflict.
3. **The Engineering (OS & Security)**: Write a malicious infinite loop or memory hog script in Python. Click "Run". Show how it gracefully times out or gets killed without crashing the backend, explaining Docker isolation and `cgroups`.
4. **The Collaboration (Networking)**: Open the shared terminal. Type an `ls` command in Window A and show the output streaming to Window B in real-time.

### Features That Make Recruiters Say "This is Impressive"
* **CRDT Explanation**: Being able to explain why you chose CRDTs over OT, and how vector clocks or logical timestamps resolve concurrency issues.
* **Docker Resource Management**: Explaining how you used Linux namespaces and cgroups (via Docker) to sandbox untrusted user code.
* **Horizontally Scaled WebSockets**: Demonstrating how you solved the "sticky session" problem by using a Redis adapter for Socket.io.
* **Offline Sync**: Show that if a user loses connection, types code, and reconnects, the CRDT algorithm perfectly merges the offline edits with the live document without conflicts.
