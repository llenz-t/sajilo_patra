# Sajilo Patra (सजिलो पत्र) — Real-Time Campus Chat & Interest Matching Architecture

A complete, full-stack, real-time messaging and campus discovery application built with **React 19**, **TypeScript**, **Tailwind CSS**, **Node.js (Express + `ws`)**, and **Supabase / Local In-Memory Fallback Persistence**.

This document outlines how every component of the application functions, key architectural terms with definitions and code examples, file references, and the complete data flow pipeline.

---

## 1. System Architecture Overview

The system consists of three interconnected tiers:
1. **Frontend Tier (Client-Side)**: React 19 Single Page Application (SPA), state management, tab-isolated session storage, and an event-driven WebSocket bus.
2. **Backend Tier (Server-Side)**: Node.js Express server mounting a custom WebSocket server (`ws`), REST API endpoints for authentication/profile management, and database synchronization.
3. **Database & Storage Tier**: Supabase PostgreSQL with Row Level Security (RLS) for durable cloud storage, paired with an in-memory resilient fallback engine.

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (Client)                     │
│  ┌──────────────────────┐        ┌────────────────────────┐ │
│  │   React UI Views     │        │    RealtimeBus (WS)    │ │
│  │ (AppView, LoginModal)│◄──────►│   (src/lib/realtime.ts)│ │
│  └──────────┬───────────┘        └───────────┬────────────┘ │
└─────────────┼────────────────────────────────┼──────────────┘
              │ HTTP (REST)                    │ WebSocket (Port 3000 /ws)
              ▼                                ▼
┌─────────────────────────────────────────────────────────────┐
│                       Backend (server.ts)                   │
│  ┌──────────────────────┐        ┌────────────────────────┐ │
│  │   Express REST API   │        │ WebSocket Router (wss) │ │
│  │   (/api/auth, etc.)  │        │ (Map<user, Set<ws>>)   │ │
│  └──────────┬───────────┘        └───────────┬────────────┘ │
└─────────────┼────────────────────────────────┼──────────────┘
              │ SQL / Client SDK               │ Query & Realtime Sink
              ▼                                ▼
┌─────────────────────────────────────────────────────────────┐
│                 Database Tier (Supabase / In-Memory)        │
│  - auth.users (Credentials & Tokens)                        │
│  - public.profiles (User Handles & Universites)             │
│  - public.messages (Chat History & Timestamps)              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Terminology & Key Technical Concepts

Below is a glossary of core terms used throughout the codebase, with short definitions, relevant file paths, and minimal code examples.

### 1. WebSocket (WS)
* **Definition**: A full-duplex, bidirectional communication protocol over a single TCP connection, allowing the server to push messages instantly to clients without polling.
* **File**: `server.ts` & `src/lib/realtime.ts`
* **Code Example**:
  ```typescript
  // Server-side WebSocket attachment (server.ts)
  const wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (socket) => {
    socket.on("message", (raw) => {
      const envelope = JSON.parse(raw.toString());
      // Handle real-time push
    });
  });
  ```

### 2. Envelope Protocol
* **Definition**: A standardized JSON messaging format containing metadata (`type`, `from`, `to`, `timestamp`) wrapping the message body for predictable serialization.
* **File**: `src/lib/realtime.ts` & `server.ts`
* **Code Example**:
  ```json
  {
    "type": "message",
    "id": "msg-1740112345",
    "from": "sirjan",
    "to": "suman",
    "content": "Hey Suman, are you ready for the lab?",
    "timestamp": "2026-08-21T02:15:00.000Z"
  }
  ```

### 3. Tab-Isolated Session Storage (`sessionStorage`)
* **Definition**: Browser storage scoped to a specific browser tab/window. Used to allow multi-user testing (e.g. testing `sirjan` and `suman` simultaneously) without credential collisions.
* **File**: `src/lib/auth.ts`
* **Code Example**:
  ```typescript
  // Isolating credentials per tab
  sessionStorage.setItem("sajilo_patra_auth_user", JSON.stringify(user));
  ```

### 4. JWT / Dev Authentication Handshake
* **Definition**: A protocol where a client authenticates immediately after opening a WebSocket connection by sending an `auth` message containing a bearer token or validated handle.
* **File**: `server.ts` & `src/lib/realtime.ts`
* **Code Example**:
  ```typescript
  // Client auth handshake
  ws.send(JSON.stringify({
    type: "auth",
    token: `dev-token-${username}`,
    username: username
  }));
  ```

### 5. Multi-Socket Client Mapping (`Map<string, Set<WebSocket>>`)
* **Definition**: A server-side routing table that maps a single username to multiple active sockets, ensuring messages are delivered across all open tabs or devices for that user.
* **File**: `server.ts`
* **Code Example**:
  ```typescript
  const clients = new Map<string, Set<AuthenticatedWebSocket>>();
  function addClientSocket(username: string, socket: AuthenticatedWebSocket) {
    if (!clients.has(username)) clients.set(username, new Set());
    clients.get(username)!.add(socket);
  }
  ```

### 6. Row Level Security (RLS)
* **Definition**: PostgreSQL database security feature in Supabase that enforces access control rules at the row level based on the requesting user's identity.
* **File**: Database policies configured on `public.messages` and `public.profiles`.

---

## 3. Frontend Architecture

The frontend is built with React 19 and organized into modular components, reactive state managers, and communication utilities.

### Key Components

1. **`src/App.tsx`**:
   - Primary application controller.
   - Switches between the **Landing View** (showcasing features, interactive terminal simulation, and hero components) and the **App View** (live chat & campus matching).

2. **`src/components/AppView.tsx`**:
   - The primary application dashboard.
   - Contains:
     - **Sidebar Directory**: Lists real database-registered campus users with live presence indicators.
     - **Active Chat Window**: Displays message streams, timestamps, delivery checkmarks, and voice notes.
     - **Composer**: Text input, emoji picker, and simulated voice note recorder.
     - **User Profile Modal & Settings**: Editable university preferences and account logout.

3. **`src/components/LoginModal.tsx`**:
   - Modal interface supporting both **Login** and **Registration**.
   - Validates user input, formats usernames (e.g. `suman`), and updates the tab session.

4. **`src/lib/auth.ts`**:
   - Manages user sessions using `sessionStorage` with `localStorage` fallback.
   - Provides reactive auth subscription (`subscribeAuth`) to notify other modules when accounts change.

5. **`src/lib/realtime.ts` (`RealtimeBus`)**:
   - Singleton client that maintains the WebSocket connection.
   - Handles auto-reconnects, ping/pong heartbeats, latency calculation, and message dispatching to React listeners.

---

## 4. Backend Architecture

The backend is built in `server.ts` using Express and Node.js.

### 1. REST API Endpoints

- **`POST /api/auth/signup`**: Registers a new user, saves the account into Supabase `auth.users` / `public.profiles` or fallback memory, and returns an auth session.
- **`POST /api/auth/login`**: Authenticates email and password, returning user credentials and tokens.
- **`GET /api/profiles`**: Returns the list of all registered student profiles for contact discovery.
- **`GET /api/messages?user=<username>`**: Retrieves persistent chat history where the requesting user is either the sender or receiver.
- **`GET /api/health`**: Health check returning server uptime, active WebSocket connection counts, and database status.

### 2. WebSocket Engine (`/ws`)

Mounted directly on port 3000 alongside Express. It manages:
- **Connection Lifecycle**: Tracks connection, ping/pong heartbeats, and disconnection cleanup.
- **Identity Verification**: Maps verified usernames to active socket connections.
- **Targeted Message Routing**: Looks up the recipient in the client map and pushes the message directly to their open sockets.
- **Offline Storage**: If a recipient is offline, the message is persisted to the database and delivered when they next connect.
- **Presence Broadcasts**: Automatically notifies all connected clients when a user joins or disconnects.

---

## 5. End-to-End Execution Pipeline

Here is the exact step-by-step lifecycle of a message sent from `sirjan` to `suman`:

```
1. USER ACTION
   User (Sirjan) types "Hello Suman" in `AppView.tsx` and clicks Send.

2. LOCAL STATE UPDATE
   `AppView.tsx` creates a message object (`isMe: true`) and appends it to
   `chatHistories["user-suman"]`.

3. WEBSOCKET DISPATCH
   `realtimeBus.dispatchMessage()` sends JSON payload to `server.ts`:
   {"type":"message", "to":"suman", "content":"Hello Suman"}

4. SERVER INGESTION & PERSISTENCE
   `server.ts` validates that the sender socket is authenticated as "sirjan".
   The message is saved to the database (`public.messages`).

5. TARGET ROUTING
   `server.ts` checks `clients.get("suman")`.
   If Suman has an active socket, the server pushes:
   {"type":"message", "id":"msg-123", "from":"sirjan", "to":"suman", "content":"Hello Suman"}

6. RECIPIENT RENDERING
   Suman's `realtimeBus` receives the frame and triggers `notifyListeners()`.
   `AppView.tsx` in Suman's browser processes the message (`isMe: false`),
   adds it to `chatHistories["user-sirjan"]`, and renders the incoming bubble on the left.
```

---

## 6. How to Run Locally

### Prerequisites
- Node.js (v18 or higher)
- npm or bun

### Setup & Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server (runs Express + Vite on port 3000):
   ```bash
   npm run dev
   ```
3. Open your browser at `http://localhost:3000`.

### Testing Multiple Users
- Open **Tab 1** in standard browsing mode and sign in as `sirjan`.
- Open **Tab 2** in an **Incognito / Private Window** and sign in as `suman`.
- Chat in real time between the two tabs!
