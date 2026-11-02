# AI Resume Matcher

An admin-only web platform that scores PDF resumes against job descriptions and shows a skill gap report. It runs entirely on your own machine: a local embedding model compares meaning, deterministic rules check each required skill, and a local LLM (Ollama) reads each job description once to propose its skill list. No paid AI APIs, no cloud services.

## Features

- **Jobs:** create, edit, close and delete job openings. The LLM extracts the required skills from the description in the background (about 25–70 s on a 2011 desktop CPU); admins review and edit them as tags, with aliases such as "NodeJS" for "Node.js".
- **Resume Matcher:** pick a job, type the candidate's name, upload one PDF and get a 0–100 % score with matched and missing skills in under a second. The same resume can't be uploaded twice to the same job.
- **Explainable results:** every matched skill shows its evidence (the term found in the resume, or the similarity and passage for a semantic match).
- **Dashboard:** active jobs, resumes received, average score, and a searchable, filterable table of all resumes.
- **Users:** admins add and remove admins and reset each other's passwords; everyone can change their own password.
- **Always current:** editing a job's skills or description recalculates all of its candidates instantly from stored embeddings.

## How the AI works

```
Job created ──► LLM (Ollama, llama3.2:3b) proposes skill names
                  └─► kept only if the job description mentions them, aliases added from a dictionary,
                      reviewed by the admin
             ──► description chunked and embedded (MiniLM) into one job vector

Resume PDF ──► text extracted ──► split into ~200-token chunks ──► each chunk embedded (MiniLM)
             ├─► semantic score : mean of the 3 chunks most similar to the job vector, rescaled to 0–1
             ├─► skill coverage : each required skill found by name / alias (word-bounded),
             │                    or by embedding similarity as a cautious fallback
             └─► final score    = 0.6 × semantic score + 0.4 × skill coverage
```

- **Embeddings** (`Xenova/all-MiniLM-L6-v2`, 384 dimensions, runs in-process through ONNX Runtime) turn text into vectors whose dot product measures similarity of meaning, so a resume about "Express APIs on MongoDB" is close to a "backend Node.js developer" job even without the exact words.
- **Chunking** is needed because the model reads at most 256 tokens; scoring the best 3 chunks rewards strongly relevant experience without penalising long resumes.
- **The LLM is never used to score resumes.** In testing, a 3B model listed skills as missing that resumes clearly stated and took 2–3 minutes per resume. It only does the one task a human reviews: proposing a job's skill list. Resumes are never sent to it, so text hidden in a resume cannot influence it.

The full design, with the measurements behind each decision, is in [project_specification.md](project_specification.md).

## Tech stack

| Layer    | Technology                                                                                      |
| :------- | :---------------------------------------------------------------------------------------------- |
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 8, TanStack Query 5, React Hook Form + zod       |
| Backend  | NestJS 12, Mongoose 9 (MongoDB 8), zod config validation, Swagger, Terminus health checks       |
| AI       | `@huggingface/transformers` 4 (MiniLM embeddings, ONNX Runtime), Ollama with `llama3.2:3b`      |
| Security | httpOnly cookie JWT, argon2id password hashing, login rate limiting, Helmet, session revocation |
| Tooling  | npm workspaces monorepo, TypeScript, Vitest, Testing Library, oxlint (type-aware), Prettier     |

## Getting started

### Prerequisites

- **Node.js 22.12+** (see `.nvmrc`)
- **MongoDB** running locally on port 27017
- **Ollama** with `llama3.2:3b` (`ollama pull llama3.2:3b`), only for the real AI
- **Hardware:** 16 GB RAM recommended (Ollama uses about 3 GB while the model is loaded); any x64 CPU, no GPU needed
- Internet on first run only, to download the embedding model (about 23 MB) and the Ollama model (about 2 GB)

### Install and run

```bash
npm run setup                                    # install dependencies and build shared types
cp apps/backend/.env.example apps/backend/.env   # then set JWT_SECRET and the ADMIN_* values
npm run seed:admin                               # create the first admin (safe to re-run)
npm run dev                                      # shared types, backend and frontend in watch mode
```

Generate a `JWT_SECRET` (at least 32 characters) with:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Then open **http://localhost:5173** and log in with the seeded admin.

| URL                              | What                                                                   |
| :------------------------------- | :--------------------------------------------------------------------- |
| http://localhost:5173            | Web app                                                                |
| http://localhost:3000/api        | REST API                                                               |
| http://localhost:3000/docs       | Swagger docs (call `POST /api/auth/login` first; the cookie is reused) |
| http://localhost:3000/api/health | Health of MongoDB, the embedding model and (with the real AI) Ollama   |

### Stand-in AI or real AI

`AI_PROVIDER` in `apps/backend/.env` selects the AI:

- **`stub`** (default): fast stand-ins that need no models: a keyword-based embedder and a dictionary skill extractor. Good for development; the test suite uses it.
- **`local`**: MiniLM embeddings and Ollama skill extraction. The first start downloads the embedding model into `apps/backend/.cache/models`. Existing jobs and resumes are re-embedded automatically when the provider changes.

## Configuration

All settings live in `apps/backend/.env` (see [.env.example](apps/backend/.env.example)) and are validated at startup.

| Variable                                          | Default                                     | Purpose                                                    |
| :------------------------------------------------ | :------------------------------------------ | :--------------------------------------------------------- |
| `JWT_SECRET`                                      | (required)                                  | Session signing key, at least 32 characters                |
| `MONGODB_URI`                                     | `mongodb://localhost:27017/resume-matcher`  | Database                                                   |
| `AI_PROVIDER`                                     | `stub`                                      | `stub` or `local`                                          |
| `EMBEDDING_MODEL` / `MODEL_CACHE_DIR`             | `Xenova/all-MiniLM-L6-v2` / `.cache/models` | Embedding model and where it is stored                     |
| `OLLAMA_URL` / `OLLAMA_MODEL`                     | `http://localhost:11434` / `llama3.2:3b`    | LLM used for skill extraction                              |
| `SIM_FLOOR` / `SIM_CEILING`                       | `0.30` / `0.80`                             | Raw similarity mapped to 0 % and 100 % (calibrated)        |
| `SKILL_MATCH_THRESHOLD`                           | `0.50`                                      | Minimum similarity for a semantic skill match (calibrated) |
| `SCORE_WEIGHT_SEMANTIC` / `SCORE_WEIGHT_COVERAGE` | `0.6` / `0.4`                               | Weights of the final score                                 |

## Scripts

Run from the repository root:

| Script               | Description                                           |
| :------------------- | :---------------------------------------------------- |
| `npm run dev`        | Shared types, backend and frontend, all in watch mode |
| `npm run seed:admin` | Create the first admin from `ADMIN_*` in `.env`       |
| `npm run build`      | Build all workspaces                                  |
| `npm run typecheck`  | Type-check all workspaces                             |
| `npm run lint`       | Lint with oxlint (type-aware, warnings fail)          |
| `npm test`           | Unit and component tests (Vitest)                     |
| `npm run test:e2e`   | Backend API tests against an in-memory MongoDB        |
| `npm run format`     | Format with Prettier (`format:check` to verify)       |

## Testing

- **Backend unit tests:** vector math, chunking, scoring, skill matching, skill grounding, the Ollama client and extractor (with a mocked server), config validation, auth and users.
- **Backend API tests:** every endpoint through HTTP against an in-memory MongoDB, including auth and sessions, rate limiting, the skill extraction lifecycle, uploads, duplicates, rescoring and the dashboard.
- **Frontend component tests:** login and route protection, jobs, skills editor, users, profile, resume matcher, candidate detail and dashboard.
- **Manual end-to-end check:** the full flow in Chrome with the real AI: log in, create a job, wait for the skills, match six sample resumes and review the results.

The automated tests use the stand-in AI, so they need neither the models nor Ollama.

## Performance

Measured on the development machine (Intel i5-2400 from 2011, 4 cores, no GPU, 16 GB RAM) with `AI_PROVIDER=local`:

| Operation                                    | Time                                                 |
| :------------------------------------------- | :--------------------------------------------------- |
| Backend startup (embedding model cached)     | about 6 s (model load under 1 s)                     |
| Resume upload, full HTTP round trip          | median 0.3 s, max 0.8 s                              |
| Recalculating a job's candidates after edits | about 0.4 s for 6 candidates                         |
| Dashboard and list API calls                 | 15–45 ms                                             |
| Skill extraction per job (LLM)               | about 25–70 s, runs in the background                |
| Memory                                       | backend about 220 MB; Ollama about 3 GB while loaded |

## Project structure

```
apps/
  backend/      NestJS API: auth, users, jobs, candidates (matching), dashboard, ai, pdf, health
  frontend/     React app: feature folders for auth, dashboard, jobs, candidates, users, profile
packages/
  shared/       Types shared by backend and frontend, so API changes break the build, not the UI
docs/           Demo script and defense notes
```

## Limitations

- Scores support a recruiter's review; they must not be used to reject candidates automatically.
- Skill matching can't judge depth of experience: a skill mentioned once counts the same as years of use.
- A 3B LLM can miss a skill or follow instructions written into a job description; the admin reviews the extracted skills.
- English only; PDF only (no OCR for scanned resumes); complex multi-column layouts may extract out of order.
- Only synthetic data was used to build and calibrate the system.

See [project_specification.md](project_specification.md) §12–13 for the full list of limitations and out-of-scope items.
