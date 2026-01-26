# Quick Start Guide

## Project Setup (5 minutes)

### 1. Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Docker & Docker Compose** ([Download](https://www.docker.com/products/docker-desktop))
- **Git** ([Download](https://git-scm.com/))
- **Yarn** (or npm)

### 2. Install Dependencies

```bash
# Install Yarn globally (if not already installed)
npm install -g yarn

# Install all project dependencies
yarn install
```

### 3. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env if needed (for development, defaults are fine)
```

### 4. Start Docker Services

```bash
# Start PostgreSQL, offline maps, and API in Docker
yarn docker:up

# Wait about 10 seconds for containers to start
# Check status:
docker ps
```

### 5. Run Development Servers

Open a new terminal and run:

```bash
# Start all development servers
yarn dev
```

This will start:
- **API Server**: http://localhost:3001
- **Web App**: http://localhost:3000
- **Mobile App**: http://localhost:8100
- **API Docs**: http://localhost:3001/api-docs

### 6. Verify Everything Works

1. **API Health Check**
   ```bash
   curl http://localhost:3001/health
   ```
   Expected: `{"status":"OK","timestamp":"..."}`

2. **Web App**
   - Open http://localhost:3000
   - Should see the Cloud S5 Road Works interface

3. **API Documentation**
   - Open http://localhost:3001/api-docs
   - Should see Swagger API documentation

## Testing the API

### Register a New User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "password123"
  }'
```

Copy the returned `token` value.

### Get User Profile

```bash
curl http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer <your-token>"
```

## Useful Commands

```bash
# View logs from all services
yarn docker:logs

# Stop all Docker services
yarn docker:down

# Restart services
yarn docker:down && yarn docker:up

# Access PostgreSQL database
docker exec -it cloud-s5-postgres psql -U cloud_user -d cloud_s5

# View specific logs
docker logs -f cloud-s5-api-auth
docker logs -f cloud-s5-postgres

# Clean everything (fresh start)
yarn docker:down
rm -rf node_modules
yarn install
yarn docker:up
```

## Common Issues & Solutions

### ❌ "Port 3001 already in use"
```bash
# Find and kill process using port 3001
lsof -i :3001
kill -9 <PID>
```

### ❌ "Docker daemon not running"
- Start Docker Desktop (on Windows/Mac)
- Or start Docker daemon: `sudo systemctl start docker` (Linux)

### ❌ "yarn: command not found"
```bash
npm install -g yarn
```

### ❌ "Cannot connect to database"
```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# Restart it
docker restart cloud-s5-postgres

# Wait 10 seconds and try again
```

### ❌ "yarn dev hangs"
- Press `Ctrl+C` to stop
- Kill lingering processes: `yarn docker:down`
- Start fresh: `yarn docker:up` then `yarn dev`

## Project Structure Quick Reference

```
📁 cloud-s5-project/
├── 📁 packages/
│   ├── 📁 api-auth/           ← Node.js/Express API
│   ├── 📁 web-app/            ← React web interface
│   └── 📁 mobile-app/         ← Ionic mobile app
├── 📁 docker/                 ← Docker configs
├── 📁 docs/                   ← Documentation
├── docker-compose.yml         ← Container setup
└── package.json               ← Root config
```

## File Changes to Make

### 1. Add Team Members to README.md

Edit [README.md](README.md) and add your team:

```markdown
## Team Members

- Student Name (STUDENT_ID)
- Student Name (STUDENT_ID)
- Student Name (STUDENT_ID)
- Student Name (STUDENT_ID)
```

### 2. Update Environment if Needed

Edit `.env` if you want different:
- Database credentials
- API port
- JWT secret

### 3. Configure Git (First Time)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Initialize git repo (if needed)
git init
git add .
git commit -m "initial: Cloud S5 project scaffold"
```

## What's Included

### ✅ Backend API
- User authentication (register, login, logout)
- User profile management
- Session management with failed attempt limiting
- Swagger/OpenAPI documentation
- PostgreSQL database schema
- Error handling middleware

### ✅ Web Application
- React 18 with Vite
- Leaflet maps integration
- User authentication flow
- Responsive design with TailwindCSS
- API integration with Axios

### ✅ Mobile Application
- Ionic + React framework
- Map display capability
- Report creation form
- User profile page
- Tab-based navigation

### ✅ Infrastructure
- Docker containerization
- PostgreSQL 15 database
- Docker Compose orchestration
- Health checks

### ✅ Documentation
- Technical architecture guide
- Database schema with examples
- Deployment instructions
- Contributing guidelines

## Next Steps

1. **Complete Team Setup**
   - Add team members to README.md
   - Configure Git repository

2. **Implement Features** (in this order recommended)
   - [ ] Authentication UI (login/register forms)
   - [ ] Map display with report markers
   - [ ] Create report form
   - [ ] Report list and filtering
   - [ ] Manager panel
   - [ ] Synchronization logic
   - [ ] Mobile app refinement

3. **Testing**
   - Write unit tests for API routes
   - Write integration tests
   - Test mobile app on real device

4. **Deployment**
   - Push to GitHub/GitLab
   - Set up CI/CD pipeline
   - Deploy to production server

## Support Resources

- **Node.js**: https://nodejs.org/
- **Express**: https://expressjs.com/
- **React**: https://react.dev/
- **Ionic**: https://ionicframework.com/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Leaflet**: https://leafletjs.com/

## Questions?

Check these in order:
1. [docs/TECHNICAL.md](docs/TECHNICAL.md) - Architecture
2. [docs/DATABASE.md](docs/DATABASE.md) - Database info
3. [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) - Code guidelines
4. Create an issue in your Git repository

---

**Ready to start coding?** 🚀

```bash
yarn docker:up
yarn dev
```

Open http://localhost:3000 in your browser!
