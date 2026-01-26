# Technical Documentation

## Architecture Overview

This project uses a **monorepo structure** with three main applications:

```
API (Node.js) ──→ PostgreSQL
     ↓
Web App (React) ──→ API
     ↓
Mobile App (Ionic + React) ──→ API
```

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **Authentication**: JWT + bcryptjs
- **Documentation**: Swagger/OpenAPI

### Frontend Web
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Maps**: Leaflet + React-Leaflet
- **HTTP Client**: Axios
- **State Management**: Zustand

### Mobile
- **Framework**: Ionic + React
- **Build Tool**: Vite
- **Maps**: Leaflet
- **HTTP Client**: Axios

## Project Structure

```
cloud-s5-project/
├── packages/
│   ├── api-auth/
│   │   ├── src/
│   │   │   ├── config/          # Configuration files
│   │   │   ├── middleware/      # Express middleware
│   │   │   ├── routes/          # API routes
│   │   │   └── index.js         # Entry point
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── web-app/
│   │   ├── src/
│   │   │   ├── pages/           # React pages
│   │   │   ├── components/      # Reusable components
│   │   │   ├── App.jsx          # Root component
│   │   │   └── main.jsx         # Entry point
│   │   ├── index.html
│   │   ├── vite.config.js
│   │   └── package.json
│   └── mobile-app/
│       ├── src/
│       │   ├── pages/           # Ionic pages
│       │   ├── App.tsx          # Root component
│       │   └── main.tsx         # Entry point
│       ├── index.html
│       └── package.json
├── docker/
│   ├── postgres/
│   │   └── init.sql             # Database initialization
│   └── offline-maps/            # Offline tile data
├── docs/                        # Documentation
├── docker-compose.yml           # Container orchestration
├── package.json                 # Root package
└── .env.example                 # Environment template
```

## Database Schema

### Users Table
- `id` (int): Primary key
- `email` (string): Unique email
- `password_hash` (string): Bcrypt hashed password
- `first_name` (string): User's first name
- `last_name` (string): User's last name
- `role` (enum): user | manager | admin
- `is_locked` (boolean): Account lock status
- `failed_login_attempts` (int): Failed attempts counter
- `last_login` (timestamp): Last login time
- `created_at` (timestamp): Account creation time

### Reports Table
- `id` (int): Primary key
- `user_id` (int): Foreign key to users
- `title` (string): Report title
- `description` (text): Report details
- `latitude` (decimal): GPS latitude
- `longitude` (decimal): GPS longitude
- `status` (enum): new | in_progress | completed | closed
- `area_m2` (decimal): Area in square meters
- `budget` (decimal): Estimated budget
- `company` (string): Responsible company
- `priority` (enum): low | medium | high
- `created_at` (timestamp): Report creation
- `updated_at` (timestamp): Last update

### Sessions Table
- `id` (int): Primary key
- `user_id` (int): Foreign key to users
- `token` (string): JWT token
- `created_at` (timestamp): Token creation time
- `expires_at` (timestamp): Token expiration

## API Routes

### Authentication

```
POST   /api/auth/register       Register new user
POST   /api/auth/login          User login
POST   /api/auth/logout         User logout
GET    /api/auth/profile        Get user profile
PUT    /api/auth/profile        Update user profile
```

### Admin (Protected)

```
GET    /api/admin/users         List all users
POST   /api/admin/users/:id/unlock   Unlock user account
```

### Reports (Protected)

```
GET    /api/reports             List all reports
POST   /api/reports             Create new report
GET    /api/reports/:id         Get report details
PUT    /api/reports/:id         Update report
DELETE /api/reports/:id         Delete report
```

## Authentication Flow

1. User registers or logs in with email/password
2. Server validates credentials
3. JWT token is generated and returned
4. Client stores token in localStorage
5. Subsequent requests include token in Authorization header: `Bearer <token>`
6. Server validates token middleware on protected routes

## Session Management

- **Max Login Attempts**: 3 (configurable)
- **Lockout Duration**: 3600000ms (1 hour)
- **Token Expiration**: 24 hours
- **Failed Attempts Counter**: Increments on each failed login, resets on success

## Running Locally

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Yarn (recommended)

### Steps

1. **Install dependencies**
   ```bash
   yarn install
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   ```

3. **Start Docker containers**
   ```bash
   yarn docker:up
   ```

   This starts:
   - PostgreSQL (port 5432)
   - Offline Maps Server (port 8080)
   - Authentication API (port 3001)

4. **Start development servers**
   ```bash
   yarn dev
   ```

   This starts:
   - API: http://localhost:3001
   - Web App: http://localhost:3000
   - Mobile App: http://localhost:8100

5. **View API documentation**
   - Open http://localhost:3001/api-docs

### Stopping Services

```bash
yarn docker:down
```

## Useful Commands

```bash
# Install dependencies for all packages
yarn install-all

# Run tests
yarn test

# Run linters
yarn lint

# Build all applications
yarn build

# View Docker logs
yarn docker:logs

# Database shell access
docker exec -it cloud-s5-postgres psql -U cloud_user -d cloud_s5
```

## Environment Variables

See `.env.example` for all available configuration options:

- `DB_*` - Database connection settings
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - Secret key for JWT signing
- `JWT_EXPIRE_IN` - Token expiration time
- `SESSION_MAX_ATTEMPTS` - Max failed login attempts
- `CORS_ORIGIN` - Allowed CORS origins
- `FIREBASE_*` - Optional Firebase config for online mode

## Development Guidelines

### Code Style
- Use ES6+ syntax
- Follow ESLint configuration
- Use meaningful variable names
- Add JSDoc comments for functions

### Commit Messages
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests
- `refactor:` - Code refactoring
- `chore:` - Build/dependency updates

### Testing
- Write unit tests for utilities
- Write integration tests for API routes
- Aim for >80% code coverage

## Troubleshooting

### Database Connection Failed
```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# View PostgreSQL logs
docker logs cloud-s5-postgres

# Restart PostgreSQL
docker restart cloud-s5-postgres
```

### Port Already in Use
```bash
# Find process using port (e.g., 3001)
lsof -i :3001

# Kill process
kill -9 <PID>
```

### CORS Issues
- Check `CORS_ORIGIN` environment variable
- Ensure web app URL is included in CORS_ORIGIN

### Node Modules Issues
```bash
# Clean install
rm -rf node_modules yarn.lock
yarn install
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment instructions.

## References

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT.io](https://jwt.io/)
- [Leaflet Documentation](https://leafletjs.com/)
- [Ionic Framework](https://ionicframework.com/)
