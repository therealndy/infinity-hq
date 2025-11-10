# Infinity HQ - Railway Deployment Guide

## Quick Deploy (5 minutes)

### 1. Login to Railway
```bash
railway login
```

### 2. Create New Project
```bash
cd infinity_hq
railway init
```

### 3. Add PostgreSQL Database
```bash
railway add -d postgres
```

### 4. Link to Database
Railway will automatically set `DATABASE_URL` environment variable.

### 5. Set Environment Variables
```bash
railway variables set JWT_SECRET=$(openssl rand -base64 64)
railway variables set NODE_ENV=production
railway variables set REQUIRE_DATABASE=true
```

### 6. Deploy
```bash
railway up
```

### 7. Get Public URL
```bash
railway domain
```

## Post-Deployment

### Check Logs
```bash
railway logs
```

### Run Database Schema
Schema will auto-initialize on first run from schema.sql

### Test Endpoints
- Status: https://your-app.railway.app/api/status
- Register: POST https://your-app.railway.app/api/auth/register
- Login: POST https://your-app.railway.app/api/auth/login

## Default Credentials
- Email: admin@infinityhq.world
- Password: admin123

**CHANGE THIS IMMEDIATELY IN PRODUCTION**
