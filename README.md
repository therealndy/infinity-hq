# Infinity HQ — Minimal MVP

This folder contains a minimal, local-first Infinity HQ MVP: an Express backend and a small static frontend that connects to the backend over WebSocket for live chat. ADI integration endpoints are placeholders and must be wired safely using environment variables or a secret manager.

What's included
- `server.js` — Express server with a WebSocket broadcast server and simple REST placeholder endpoints
- `public/index.html` — Minimal single-file frontend for live chat and ADI proxy
- `Dockerfile` — Small image to run the app in containers
- `.env.example` — Example environment variables

Quick start (macOS, zsh)
1. cd into the project:
   cd "/Users/macbook/Documents/Project G/infinity_hq"
2. Install dependencies:
   npm install
3. Start locally:
   npm start
4. Open http://localhost:3000 in your browser.

Notes for production
- Do NOT store API keys in the repo. Use Cloud Secret Manager or similar.
- Replace `/api/proxy-chat` placeholder with a secure server-side call to ADI. Implement rate limits and input validation.
- Harden TLS, CSP, and CORS for the frontend. Consider running behind a reverse proxy.

Next steps (recommended):
- Add authentication (JWT + hardware token support)
- Add database (Postgres) with client-side encryption for user secrets
- Add end-to-end encrypted rooms for private collaboration
- Integrate unit/integration tests

Contact
- Built by ADI & Family
