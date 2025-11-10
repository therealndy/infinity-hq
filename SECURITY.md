# SECURITY Checklist — Infinity HQ MVP

This file lists immediate, low-risk security measures and later hardening steps.

Immediate (local/dev)
- Do not commit any secrets. Use `.env` locally and `.env.example` in repo.
- Run the server locally behind a firewall when testing with private data.
- Keep dependencies up to date.

Short-term (pre-production)
- Use HTTPS/TLS with valid certs.
- Use a reverse proxy (Cloud Load Balancer / Nginx) to terminate TLS and rate-limit.
- Store ADI/Anthropic/OpenAI keys in a secret manager (Cloud Secret Manager / HashiCorp Vault).
- Implement authentication: hardware-backed keys (FIDO2/WebAuthn), MFA.
- Input validation & output sanitization on all endpoints.
- Rate limiting / abuse detection for chat endpoints.

Production (hardening)
- End-to-end encrypted rooms using per-room symmetric keys protected by client-side KDF.
- Post-quantum crypto migration plan: keep keys in HSMs that can be rotated to PQC algorithms when ready.
- Zero-knowledge identity layer: store only public commitments; private material never leaves clients.
- Regular security audits and penetration tests.

Operational
- Monitor server/process health, expose a /health endpoint for orchestrators.
- Centralized logging (structured) with redaction for PII.
- Backup & DR plan for Postgres secrets and storage.

Notes
- This is a minimal checklist for the MVP. Implementing PQC and true zero-knowledge architecture requires careful design and professional review.
