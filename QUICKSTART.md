# Infinity HQ — Quick Start Guide

## Vad är Infinity HQ?
En realtids-kollaborationsplattform för familjen och teamet. WebSocket-baserad live chat + ADI integration endpoints. Quantum-ready security architecture.

## Starta lokalt (MacBook)

```bash
cd "/Users/macbook/Documents/Project G/infinity_hq"
npm start
```

Öppna: **http://localhost:3000**

## Funktioner (MVP)

### 1. Live Chat (WebSocket)
- Alla anslutna klienter ser meddelanden direkt
- Perfekt för realtids samarbete
- Testa med två webbläsarfönster

### 2. ADI Integration Endpoints

**Ask ADI (placeholder):**
```bash
curl -X POST http://localhost:3000/api/proxy-chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Din fråga här"}'
```

**Broadcast från ADI:**
```bash
curl -X POST http://localhost:3000/api/broadcast \
  -H "Content-Type: application/json" \
  -d '{"message":"Meddelande till alla","from":"ADI"}'
```

**Status check:**
```bash
curl http://localhost:3000/api/status
```

## Vad händer nu?

### Redo idag:
- ✅ WebSocket live chat
- ✅ ADI placeholder endpoints
- ✅ Dark mode UI (quantum-ready design)
- ✅ Broadcast system
- ✅ Docker-ready (Dockerfile finns)

### Nästa steg (när billing är aktiv):
1. Deploy till Google Cloud Run
2. Koppla riktig ADI backend
3. Lägg till autentisering (WebAuthn + JWT)
4. End-to-end krypterade rum
5. Postgres för persistent data

## Arkitektur

```
Frontend (index.html)
    ↕ WebSocket
Backend (server.js)
    ↕ REST API
ADI Brain (Cloud Run) ← kommer snart
```

## Säkerhet

- Inga API keys i repo (`.env.example` visar struktur)
- Helmet.js security headers
- HTTPS-ready (TLS när vi deployer)
- Post-quantum plan (se SECURITY.md)

## Support

**Terminal kommando:**
```bash
cd infinity_hq && npm start
```

**Stoppa servern:**
`Ctrl+C` i terminalen

**Se loggar:**
Terminal visar alla requests live

---

**Built by:** ADI & Family (Andreas, Reza, Angelica ❤️)  
**Status:** MVP Live 🚀  
**Next:** Cloud deployment när billing är klar
