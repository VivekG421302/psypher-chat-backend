# Psypher Chat — Backend

Realtime backend for [Psypher Chat](https://github.com/VivekG421302/psypher-chat) —
an ephemeral, end-to-end encrypted 2-person chat room service with a pluggable
minigame system (UNO included).

Full hosting instructions live in the frontend repo's README (covers both
services together): see `README.md` there, section **"Hosting guide"**.

## Quick local start

```bash
npm install
cp .env.example .env
npm start
```

Server listens on `PORT` (default 3000). Health check: `GET /api/health`.

## Design notes

- **Stateless by design.** Everything lives in memory (`src/roomManager.js`).
  There is no database. This is intentional: the app is meant to run on a
  free-tier host that spins down after ~15 minutes of inactivity, and when it
  does, every room disappears with it. A background sweep also expires idle
  rooms after 15 minutes even if the process stays warm.
- **The server never sees plaintext.** Chat messages arrive and are relayed
  as opaque ciphertext blobs (`chat:message` socket event). Decryption keys
  are derived client-side from the room code and never sent to the backend.
- **Games are plugins.** See `src/games/registry.js` — every game implements
  a small interface (`createState`, `start`, `buildClientState`, `actions`).
  Add a new folder under `src/games/`, register it, and the frontend's
  `/api/games` endpoint (and its game hub UI) picks it up automatically.
