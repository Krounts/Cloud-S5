# Cloud S5 Project - Road Work Reporting System

A comprehensive platform for reporting and tracking road work in Antananarivo using offline maps and real-time synchronization.

## Project Overview

This is a full-stack application with three main components:

- **API Authentication Service** (Node.js + Express)
- **Web Application** (React)
- **Mobile Application** (Ionic + React)

**Technologies:**
- Backend: Node.js, Express, PostgreSQL
- Frontend Web: React, Leaflet, TailwindCSS
- Mobile: Ionic, React, Leaflet
- Maps: Offline tile server (for Antananarivo streets)
- Authentication: JWT + optional Firebase

## Project Structure

```
cloud-s5-project/
├── packages/
│   ├── api-auth/           # Authentication API (Node.js)
│   ├── web-app/            # Web application (React)
│   └── mobile-app/         # Mobile application (Ionic + React)
├── docker/
│   ├── postgres/           # PostgreSQL initialization
│   └── offline-maps/       # Offline maps data
├── docs/                   # Technical documentation
├── docker-compose.yml      # Docker orchestration
└── .env.example            # Environment variables template
```

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Yarn (recommended)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cloud-s5-project
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Docker services**
   ```bash
   yarn docker:up
   ```

5. **Run development servers**
   ```bash
   yarn dev
   ```

   This will start:
   - API: http://localhost:3001
   - Web App: http://localhost:3000
   - Mobile App: http://localhost:8100

## Available Commands

- `yarn install-all` - Install dependencies for all packages
- `yarn dev` - Start all development servers
- `yarn build` - Build all packages
- `yarn test` - Run tests
- `yarn lint` - Run linters
- `yarn docker:up` - Start Docker containers
- `yarn docker:down` - Stop Docker containers
- `yarn docker:logs` - View Docker logs

## Module Documentation

### Authentication Module
- Email/Password authentication
- User registration
- User profile management
- Session management (TTL configurable)
- Failed login attempt limiting (default: 3 attempts)
- REST API with Swagger documentation

**API Endpoints:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/reset-attempts` - Reset user lockout (Admin)

### Web Application
**User Roles:**
- **Visitor** - View map and reports
- **User** - Create and manage reports
- **Manager** - Full control, synchronization, user management

**Features:**
- Interactive map with Leaflet
- Real-time road work status
- Summary dashboard (count, area, budget, progress)
- Manager panel for synchronization
- User account blocking management

### Mobile Application
- Firebase/Postgres authentication
- Report creation from mobile map
- Location-based road work reporting
- Filter personal reports
- Online/offline support

## Database Schema

See [docs/DATABASE.md](docs/DATABASE.md) for the complete ERD and table structures.

## API Documentation

Swagger/OpenAPI documentation available at:
- `http://localhost:3001/api-docs`

## Development Guidelines

### Folder Structure Convention
- `src/` - Source code
- `src/routes/` - API routes
- `src/controllers/` - Business logic
- `src/models/` - Data models
- `src/middleware/` - Express middleware
- `src/utils/` - Utility functions
- `src/config/` - Configuration files

### Commit Convention
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test additions/modifications
- `chore:` - Build, dependencies, etc.

## Team Members

Add team member information here (Name, Student ID):
- [ ] Team Member 1 - Student ID
- [ ] Team Member 2 - Student ID
- [ ] Team Member 3 - Student ID
- [ ] Team Member 4 - Student ID

## Documentation

- [Technical Documentation](docs/TECHNICAL.md)
- [Database Schema](docs/DATABASE.md)
- [API Reference](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Contributing Guidelines](docs/CONTRIBUTING.md)

## License

MIT - Confidential for Cloud S5 Project

## Important Notes

⚠️ **Confidential - Not for Public Consumption or Distribution**

This project is created for educational purposes as part of the Promotion 17 Cloud S5 course.
