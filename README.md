# Kanban Board

A full-stack, real-time Kanban board with secure authentication and personal boards.

## Features

- **Drag-and-drop board** — move cards between columns (dnd-kit)
- **Secure authentication** — register/login with hashed passwords (bcrypt) and JWT sessions
- **Personal boards** — each user sees and edits only their own board
- **Real-time sync** — changes appear instantly across sessions via WebSockets (Socket.IO)
- **Persistent storage** — PostgreSQL with Prisma ORM
- **Light / dark theme** toggle

## Tech Stack

- **Frontend:** React, TypeScript, Vite, dnd-kit, Socket.IO client
- **Backend:** Node.js, Express, TypeScript, Socket.IO
- **Database:** PostgreSQL, Prisma ORM
- **Auth:** JWT, bcrypt
- **Infrastructure:** Docker (PostgreSQL), monorepo with unified dev tooling

## Security

- Passwords hashed with bcrypt (never stored in plaintext)
- JWT authentication for protected REST and WebSocket connections
- Per-user data isolation with ownership checks on every endpoint (prevents IDOR)
- SQL injection prevented via Prisma's parameterized queries
- Rate limiting on auth endpoints (brute-force protection)
- Input validation with Zod
- Secrets managed through environment variables

## Getting Started

### Prerequisites

- Node.js
- Docker Desktop

### Setup

1. Clone and install:

```bash
   git clone https://github.com/EmirProjects7/kanban-board-project.git
   cd kanban-board-project
   npm install && npm install --prefix backend && npm install --prefix frontend

2. Create `backend/.env`:


3. Run migrations:
```bash
   cd backend && npx prisma migrate dev && cd ..
```

4. Start everything with one command:

```bash
   npm run dev
```

App runs at `http://localhost:5173`.