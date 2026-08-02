# Kanban Board

A full-stack, real-time Kanban board with secure authentication and personal boards.

Every user signs in and sees only their own boards. Cards and columns are dragged
into place, and changes appear in any other open session straight away.

## Features

- **Drag and drop** — reorder cards inside a column, move them between columns, drag whole columns into a new order, and reorder the boards themselves (dnd-kit)
- **Inline editing** — double click a card or a column title to rename it
- **Card detail** — open a card to write a description; cards carrying notes are marked on the board
- **Secure authentication** — register and log in with hashed passwords (bcrypt) and JWT sessions
- **Several boards** — keep work, personal and anything else apart, switched from a drawer
- **Personal data** — each user sees and edits only their own boards
- **Real-time sync** — changes appear instantly across sessions over WebSockets (Socket.IO)
- **Persistent storage** — PostgreSQL with Prisma ORM
- **Light and dark theme**, remembered between visits

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React, TypeScript, Vite, dnd-kit, Socket.IO client |
| Backend | Node.js, Express, TypeScript, Socket.IO |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT, bcrypt |
| Validation | Zod |
| Tests | Vitest, Testing Library, Supertest |
| Infrastructure | Docker (PostgreSQL), monorepo with a single dev command |

## Security

- Passwords are hashed with bcrypt and never stored in plaintext
- JWT authentication on both the REST endpoints and the WebSocket connection
- Ownership runs through the board on every write, including the individual
  cards in a reorder, so one user cannot move another user's card, or a card
  from one of their other boards, into the board they are looking at
- A board reorder is applied in a single transaction, so a rejected request
  cannot leave the board half-updated
- SQL injection is prevented by Prisma's parameterised queries
- Rate limiting on the auth endpoints for brute-force protection
- Request bodies are validated with Zod
- Secrets come from environment variables and are never committed

## Getting started

### Prerequisites

- Node.js
- Docker Desktop

### 1. Clone and install

```bash
git clone https://github.com/EmirProjects7/kanban-board-project.git
```

```bash
cd kanban-board-project && npm install && npm install --prefix backend && npm install --prefix frontend
```

### 2. Configure the environment

Copy the template and fill in your own values:

```bash
cp backend/.env.example backend/.env
```

`backend/.env` is gitignored and must never be committed. The template lists
every variable; the required ones are:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string, e.g. `postgresql://USER:PASSWORD@localhost:5432/DATABASE` |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credentials Docker creates the database with. They must match `DATABASE_URL`. |
| `JWT_SECRET` | Key used to sign session tokens |

Optional, with the defaults shown:

| Variable | Default | When to change it |
| --- | --- | --- |
| `BACKEND_PORT` | `3000` | The API port |
| `FRONTEND_URL` | `http://localhost:5173` | The origin allowed by CORS |
| `POSTGRES_PORT` | `5432` | If another project already uses 5432 on your machine. Change the port in `DATABASE_URL` to match. |

Generate a strong `JWT_SECRET` rather than inventing one:

```bash
openssl rand -base64 32
```

Choose your own database password too. Do not reuse a password from anywhere
else, and do not paste real values into issues, pull requests or screenshots.

The frontend talks to `http://localhost:3000` by default. To point it elsewhere,
create `frontend/.env` from `frontend/.env.example` and set `VITE_API_URL`.

### 3. Create the database schema

```bash
npm run db
```

```bash
cd backend && npx prisma migrate dev && cd ..
```

### 4. Run it

```bash
npm run dev
```

This starts Postgres in Docker, the API and the frontend together.

- App — http://localhost:5173
- API — http://localhost:3000 (returns the endpoint list and whether the database is reachable)

## Scripts

From the repository root:

| Command | What it does |
| --- | --- |
| `npm run dev` | Database, API and frontend together |
| `npm run db` | Just the Postgres container |

Per workspace:

| Command | What it does |
| --- | --- |
| `npm test --prefix backend` | Backend test suite |
| `npm test --prefix frontend` | Frontend test suite |
| `npm run build --prefix backend` | Type-check and compile the API |
| `npm run build --prefix frontend` | Production build of the frontend |
| `npm run lint --prefix backend` | ESLint on the API |
| `npm run lint --prefix frontend` | ESLint on the frontend |

Every pull request runs the lint, type check, tests and build for both
workspaces through GitHub Actions.

Inspect the data with Prisma Studio:

```bash
cd backend && npx prisma studio
```

## API

All board endpoints require an `Authorization: Bearer <token>` header. The token
comes from the login response.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Exchange credentials for a token |
| `GET` | `/api/boards` | The signed-in user's boards |
| `POST` | `/api/boards` | Create a board |
| `PUT` | `/api/boards/order` | Persist the order of the boards |
| `PUT` | `/api/boards/:boardId` | Rename a board |
| `DELETE` | `/api/boards/:boardId` | Delete a board, unless it is the last one |
| `GET` | `/api/boards/:boardId/columns` | One board's columns and cards |
| `POST` | `/api/boards/:boardId/columns` | Create a column on that board |
| `PUT` | `/api/boards/:boardId/columns` | Persist that board's ordering |
| `PUT` | `/api/columns/:columnId` | Rename a column |
| `DELETE` | `/api/columns/:columnId` | Delete a column |
| `POST` | `/api/columns/:columnId/cards` | Add a card |
| `PUT` | `/api/cards/:cardId` | Change a card's title, description, or both |
| `DELETE` | `/api/cards/:cardId` | Delete a card |

Clients also receive a `board:updated` event over Socket.IO carrying
`{boardId, columns}` whenever one of their boards changes. The room is per
user, so a client showing a different board ignores it.

## Project structure

```
backend/
  prisma/           schema and migrations
  src/
    routes/         auth, boards, columns and cards endpoints
    middleware/     authentication and rate limiting
    test/           backend test suite
    app.ts          express app
    server.ts       listening and socket wiring
frontend/
  src/
    components/     board UI
    hooks/          board state and drag and drop
    test/           frontend test suite
    api.ts          API client
```
