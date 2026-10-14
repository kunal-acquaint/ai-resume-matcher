# AI Resume Matcher

AI-powered resume matcher and skill gap analyzer. It scores resumes against a job description using local semantic embeddings and uses a local LLM (Ollama) to list matched and missing skills and generate interview questions. No paid AI APIs are used; everything runs locally.

See [project_specification.md](project_specification.md) for the full design.

## Repository structure

npm workspaces monorepo:

```
apps/
  backend/     NestJS 12 API (@resume-matcher/backend)
packages/
  shared/      Types shared by backend and frontend (@resume-matcher/shared)
```

The frontend (`apps/frontend`) will be added later.

## Prerequisites

- Node.js 22.12+ (see `.nvmrc`)
- MongoDB running locally on port 27017 (or set `MONGODB_URI`)
- Ollama, once the LLM features are implemented

## Getting started

```bash
npm run setup                                    # install dependencies and build shared types
cp apps/backend/.env.example apps/backend/.env   # then set JWT_SECRET and the ADMIN_* values
npm run seed:admin                               # create the first admin (safe to re-run)
npm run dev                                      # start the backend in watch mode
```

`JWT_SECRET` is required (at least 32 random characters). Generate one with:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

All other API routes require logging in first: in Swagger, call `POST /api/auth/login` and the session cookie is used for the following requests.

- API: http://localhost:3000/api
- Health check: http://localhost:3000/api/health
- Swagger docs: http://localhost:3000/docs

## Scripts

Run from the repository root:

| Script               | Description                                     |
| :------------------- | :---------------------------------------------- |
| `npm run dev`        | Shared types (watch) and backend (watch)        |
| `npm run seed:admin` | Create the first admin from `ADMIN_*` in `.env` |
| `npm run build`      | Build all workspaces                            |
| `npm run typecheck`  | Type-check all workspaces                       |
| `npm run lint`       | Lint with oxlint (type-aware)                   |
| `npm test`           | Unit tests (Vitest)                             |
| `npm run test:e2e`   | End-to-end tests against an in-memory MongoDB   |
| `npm run format`     | Format with Prettier (`format:check` to verify) |
