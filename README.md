# Kanban Board

[![CI](https://github.com/EmirProjects7/kanban-board-project/actions/workflows/ci.yml/badge.svg)](https://github.com/EmirProjects7/kanban-board-project/actions/workflows/ci.yml)
[![backend coverage](https://img.shields.io/badge/backend%20coverage-96%25-brightgreen)](#tests-and-coverage)
[![frontend coverage](https://img.shields.io/badge/frontend%20coverage-88%25-brightgreen)](#tests-and-coverage)

A full-stack, real-time Kanban board with secure authentication and personal boards.

Every user signs in and sees only their own boards. Cards and columns are dragged
into place, and changes appear in any other open session straight away.

![Two sessions of the same board side by side. Only the left one is used; the right one updates over the socket without a reload.](docs/demo.gif)

## Features

- **Drag and drop** — reorder cards inside a column, move them between columns, drag whole columns into a new order, and reorder the boards themselves (dnd-kit)
- **Inline editing** — double click a card title or a column title to rename it
- **Card detail** — double click anywhere else on a card to open it, or use the button in its corner; write a description there, and cards carrying notes are marked on the board
- **Search** — press `/` to jump to it, then narrow the board by a word in a card's title or description; accents are optional, so `gorusme` finds `Görüşme`. Filtered columns show how much they are hiding, as `1 / 4`, and say so rather than claiming to be empty. One Clear resets every filter at once
- **Labels** — colour them, pin them onto cards, and narrow the board to the ones you pick
- **Due dates** — give a card a day; late ones turn red, today stands out, and one toggle narrows the board to what is overdue
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
- Logging out retires the token on the server rather than only forgetting it in
  the browser, so a copy taken off the machine stops working too
- Ownership runs through the board on every write, including the individual
  cards in a reorder, so one user cannot move another user's card, or a card
  from one of their other boards, into the board they are looking at
- A label can only be pinned onto a card on the same board, and label colours
  come from a fixed set, so nothing a user types reaches a style value
- The API and the database listen on localhost only while developing, so
  neither is handed to other devices on the same network
- A board reorder is applied in a single transaction, so a rejected request
  cannot leave the board half-updated
- SQL injection is prevented by Prisma's parameterised queries
- Rate limiting on the auth endpoints for brute-force protection
- Request bodies are validated with Zod
- Secrets come from environment variables and are never committed

## Getting started

### Prerequisites

- Node.js 22 or newer
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
| `BACKEND_HOST` | `127.0.0.1` | Set to `0.0.0.0` only where the API has to be reachable from outside the machine |
| `FRONTEND_URL` | `http://localhost:5173` | The origin allowed by CORS |
| `POSTGRES_PORT` | `5432` | If another project already uses 5432 on your machine. Change the port in `DATABASE_URL` to match. |
| `POSTGRES_BIND_HOST` | `127.0.0.1` | The interface the database is published on. Leave it alone unless something outside the machine has to reach it. |

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

This waits for Postgres to accept connections before it returns, so the
migration below can run straight after it.

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

## Tests and coverage

473 tests: 135 on the API, 334 on the UI, and 4 end-to-end in a real browser.

| Workspace | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Backend | 96.6% | 93.2% | 95.9% | 96.5% |
| Frontend | 87.2% | 84.0% | 84.9% | 88.2% |

Both suites run with thresholds set just under those figures, so a change that
drops coverage fails CI rather than going unnoticed. The generated Prisma
client, `server.ts` and the test folders themselves are excluded from the
measurement, since none of them say anything about how well the source is
covered.

```bash
npm run test:coverage --prefix backend
```

The end-to-end suite is separate and needs the stack running. It covers what
the unit tests cannot reach: that a dragged card is still in its new column
after a reload, that a rename survives one, that a card added in one session
arrives in another over the socket without a reload, and that logging out
stops the token working rather than only clearing it in the browser.

```bash
npm run e2e
```

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
| `npm run test:coverage --prefix backend` | Backend suite with a coverage report |
| `npm run test:coverage --prefix frontend` | Frontend suite with a coverage report |
| `npm run e2e` | End-to-end suite, starts the stack itself |
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
| `POST` | `/api/auth/logout` | Retire every token the account has been issued |
| `GET` | `/api/boards` | The signed-in user's boards |
| `POST` | `/api/boards` | Create a board |
| `PUT` | `/api/boards/order` | Persist the order of the boards |
| `PUT` | `/api/boards/:boardId` | Rename a board |
| `DELETE` | `/api/boards/:boardId` | Delete a board, unless it is the last one |
| `GET` | `/api/boards/:boardId/columns` | One board's columns and cards |
| `POST` | `/api/boards/:boardId/columns` | Create a column on that board |
| `PUT` | `/api/boards/:boardId/columns` | Persist that board's ordering |
| `GET` | `/api/boards/:boardId/labels` | That board's labels |
| `POST` | `/api/boards/:boardId/labels` | Create a label on that board |
| `PUT` | `/api/labels/:labelId` | Rename or recolour a label |
| `DELETE` | `/api/labels/:labelId` | Delete a label |
| `PUT` | `/api/columns/:columnId` | Rename a column |
| `DELETE` | `/api/columns/:columnId` | Delete a column |
| `POST` | `/api/columns/:columnId/cards` | Add a card |
| `PUT` | `/api/cards/:cardId` | Change a card's title, description, due date, or any mix |
| `DELETE` | `/api/cards/:cardId` | Delete a card |
| `PUT` | `/api/cards/:cardId/labels/:labelId` | Pin a label onto a card on the same board |
| `DELETE` | `/api/cards/:cardId/labels/:labelId` | Take a label off a card |

Clients also receive a `board:updated` event over Socket.IO carrying
`{boardId, columns}` whenever one of their boards changes. The room is per
user, so a client showing a different board ignores it.

## Project structure

```
backend/
  prisma/           schema and migrations
  src/
    routes/         auth, boards, columns, cards and labels endpoints
    middleware/     authentication and rate limiting
    test/           backend test suite
    app.ts          express app and the routers it mounts
    server.ts       http listener, socket handshake auth and per-user rooms
    socket.ts       holds the Socket.IO instance the rest of the app emits on
    board.ts        reads a board and broadcasts it as board:updated
    queries.ts      the shared query shape every read of a board goes through
    validation.ts   Zod schemas and the fixed label colours
    prisma.ts       Prisma client
frontend/
  src/
    components/     board UI
    hooks/          board state and drag and drop
    test/           frontend test suite
    api.ts          API client
    socket.ts       Socket.IO client and its reconnect handling
    dueDate.ts      due date parsing, formatting and overdue comparison
    types.ts        types shared across the UI
```
