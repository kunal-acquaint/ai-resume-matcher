# AI Resume Matcher

Admin-only web platform that scores resumes against job descriptions using local semantic embeddings and deterministic skill matching, with a local LLM (Ollama) extracting each job's required skills. No paid AI APIs are used; everything runs locally.

See [project_specification.md](project_specification.md) for the full design.

## Repository structure

npm workspaces monorepo:

```
apps/
  backend/     NestJS 12 API (@resume-matcher/backend)
  frontend/    React 19 + Vite dashboard (@resume-matcher/frontend)
packages/
  shared/      Types shared by backend and frontend (@resume-matcher/shared)
```

## Prerequisites

- Node.js 22.12+ (see `.nvmrc`)
- MongoDB running locally on port 27017 (or set `MONGODB_URI`)
- Ollama with `llama3.2:3b`, only when using the real AI (`AI_PROVIDER=local`)

## Getting started

```bash
npm run setup                                    # install dependencies and build shared types
cp apps/backend/.env.example apps/backend/.env   # then set JWT_SECRET and the ADMIN_* values
npm run seed:admin                               # create the first admin (safe to re-run)
npm run dev                                      # start shared types, backend and frontend in watch mode
```

`JWT_SECRET` is required (at least 32 random characters). Generate one with:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

- Web app: http://localhost:5173 (log in with the seeded admin)
- API: http://localhost:3000/api
- Swagger docs: http://localhost:3000/docs (call `POST /api/auth/login` first; the session cookie is reused)

In development the Vite dev server proxies `/api` to the backend, so the httpOnly session cookie works without CORS configuration.

## Scripts

Run from the repository root:

| Script               | Description                                           |
| :------------------- | :---------------------------------------------------- |
| `npm run dev`        | Shared types, backend and frontend, all in watch mode |
| `npm run seed:admin` | Create the first admin from `ADMIN_*` in `.env`       |
| `npm run build`      | Build all workspaces                                  |
| `npm run typecheck`  | Type-check all workspaces                             |
| `npm run lint`       | Lint with oxlint (type-aware)                         |
| `npm test`           | Unit and component tests (Vitest)                     |
| `npm run test:e2e`   | Backend end-to-end tests against an in-memory MongoDB |
| `npm run format`     | Format with Prettier (`format:check` to verify)       |
