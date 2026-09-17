# Contributing to CertiChain

Thanks for your interest in improving CertiChain. This document covers how to set up the project, the workflow we follow, and the conventions we expect.

## Getting Started

All you need to run the full stack locally is **Docker** and **Docker Compose**:

```bash
git clone https://github.com/yash1648/certichain.git
cd certichain
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:6969 |
| Swagger UI | http://localhost:6969/swagger-ui/ |

For backend or frontend-only development (hot reload), see the [README](README.md#getting-started-local).

## Project Layout

| Path | Contents |
|------|----------|
| `certchain/` | Spring Boot backend (controllers, services, security, domain model) |
| `certchain/src/main/resources/db/migration/` | Flyway migrations |
| `frontend/` | React + Vite single-page app |
| `deploy/` | Production deployment assets (see [deploy/DEPLOY.md](deploy/DEPLOY.md)) |

## Development Workflow

1. **Branch** off `main` using a descriptive prefix:
   - `feat/…` for new features
   - `fix/…` for bug fixes
   - `docs/…` for documentation
2. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/) — e.g. `feat(issuer): add bulk credential export`.
3. **Test** your change locally before opening a pull request.
4. **Open a pull request** against `main`, describing what changed and why. Reference the related issue where applicable.

## Before You Push

Backend:

```bash
cd certchain
./mvnw test
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

## Code Style

- **Java** — 4-space indentation, constructor injection (no field injection), and clear service boundaries. Keep controllers thin; put logic in services.
- **JavaScript / React** — functional components and hooks, the existing `services/` pattern for API calls, and JSDoc on service methods.
- **Migrations** — never edit an applied migration. Add a new `V{n}__description.sql` file instead.
- **Secrets** — never commit credentials. `.env`, `*.p12`, `*.jks`, and similar files are gitignored; keep them that way.

## Security

Please do not report security vulnerabilities through public issues. See [SECURITY.md](SECURITY.md).

## Code of Conduct

Participation in this project is governed by our [Code of Conduct](CODE_OF_CONDUCT.md).
