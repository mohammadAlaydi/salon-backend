# Setting Up Backend Without Docker

If you prefer not to use Docker, you can run PostgreSQL and Redis locally.

---

## 📋 Prerequisites

1. **PostgreSQL 16+** installed and running
2. **Redis 7+** installed and running

---

## 🗄️ PostgreSQL Setup

### Windows Installation

1. **Download PostgreSQL:**
   - Visit: https://www.postgresql.org/download/windows/
   - Download the installer
   - Run the installer

2. **During Installation:**
   - Remember the password you set for the `postgres` user
   - Default port: `5432`

3. **Create Database:**
   ```sql
   -- Connect to PostgreSQL (using pgAdmin or psql)
   CREATE DATABASE salon_db;
   CREATE USER salon_user WITH PASSWORD 'salon_password';
   GRANT ALL PRIVILEGES ON DATABASE salon_db TO salon_user;
   ```

### Update .env File

Update `salon-backend/.env`:

```env
# Use your local PostgreSQL credentials
DATABASE_URL=postgresql://salon_user:salon_password@localhost:5432/salon_db

# Or if using default postgres user:
# DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/salon_db
```

---

## 🔴 Redis Setup

### Windows Installation

1. **Option A: Using WSL (Recommended)**
   ```bash
   # In WSL terminal
   sudo apt update
   sudo apt install redis-server
   redis-server
   ```

2. **Option B: Using Memurai (Windows Native)**
   - Download: https://www.memurai.com/
   - Install and start the service

3. **Option C: Using Chocolatey**
   ```powershell
   choco install redis-64
   ```

### Update .env File

```env
REDIS_URL=redis://localhost:6379
```

---

## ✅ Verify Services Are Running

### Check PostgreSQL
```powershell
# Using psql (if in PATH)
psql -U salon_user -d salon_db

# Or check service
Get-Service postgresql*
```

### Check Redis
```powershell
# Test connection
redis-cli ping
# Should return: PONG
```

---

## 🚀 Start Backend

Once both services are running:

```powershell
cd salon-backend
npm run prisma:generate
npm run prisma:migrate:dev
npm run start:dev
```

---

## 🐛 Troubleshooting

### PostgreSQL Connection Failed
- Check if PostgreSQL service is running
- Verify username/password in `.env`
- Check if port 5432 is accessible
- Try: `telnet localhost 5432`

### Redis Connection Failed
- Check if Redis is running
- Verify port 6379 is accessible
- Try: `redis-cli ping`

---

## 📝 Quick Reference

**PostgreSQL Default:**
- Host: `localhost`
- Port: `5432`
- User: `postgres` (or `salon_user`)
- Database: `salon_db`

**Redis Default:**
- Host: `localhost`
- Port: `6379`
- No password (default)

