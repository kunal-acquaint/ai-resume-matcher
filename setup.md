# Setup Guide

Step-by-step instructions to run the AI Resume Matcher on a fresh machine, with notes for Windows, macOS and Ubuntu. Everything runs locally: no Docker, no cloud services, no paid APIs.

- [1. What you will install](#1-what-you-will-install)
- [2. System requirements](#2-system-requirements)
- [3. Install the prerequisites](#3-install-the-prerequisites)
- [4. Get the code and install dependencies](#4-get-the-code-and-install-dependencies)
- [5. Configure the backend](#5-configure-the-backend)
- [6. Create the first admin](#6-create-the-first-admin)
- [7. Start the app](#7-start-the-app)
- [8. Check that everything works](#8-check-that-everything-works)
- [9. Run the tests (optional)](#9-run-the-tests-optional)
- [10. Day-to-day commands](#10-day-to-day-commands)
- [11. Troubleshooting](#11-troubleshooting)

## 1. What you will install

| Tool        | Version          | Needed for                                                          |
| :---------- | :--------------- | :------------------------------------------------------------------ |
| **Git**     | any recent       | Cloning the repository                                              |
| **Node.js** | 22.12 or newer   | Backend, frontend and tooling (npm 10 comes with it)                |
| **MongoDB** | 7 or 8 Community | The database, running locally on port 27017                         |
| **Ollama**  | any recent       | Only for the real AI (`AI_PROVIDER=local`): skill extraction by LLM |

The embedding model (MiniLM, about 23 MB) is not installed separately: the backend downloads it on its first start with the real AI.

The app has two AI modes, selected with `AI_PROVIDER` in `apps/backend/.env`:

- **`stub`:** fast stand-ins, no models and no Ollama. Good for a first run, development and the tests.
- **`local`:** the real AI. MiniLM embeddings run inside the backend, and Ollama with `llama3.2:3b` extracts job skills.

You can start with `stub` and switch to `local` later; existing jobs and resumes are re-embedded automatically.

## 2. System requirements

|          | Stand-in AI (`stub`) | Real AI (`local`)                                                               |
| :------- | :------------------- | :------------------------------------------------------------------------------ |
| RAM      | 4 GB                 | 8 GB minimum, 16 GB recommended (Ollama uses about 3 GB)                        |
| Disk     | about 2 GB free      | about 5 GB free (the Ollama model alone is about 2 GB)                          |
| CPU      | any 64-bit           | any 64-bit; no GPU needed. Skill extraction takes 25–70 s on a 2011 desktop CPU |
| Internet | for `npm install`    | also on the first start, to download the two models                             |

**Supported platforms**

| OS                                   | Status                                                                                                                |
| :----------------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| Windows 10 / 11 (x64)                | Supported (development machine)                                                                                       |
| macOS on Apple Silicon (M1 or later) | Supported                                                                                                             |
| macOS on Intel                       | **Not supported**: the embedding runtime (`onnxruntime-node`) ships no Intel macOS build, so the backend cannot start |
| Ubuntu 22.04 / 24.04 (x64 or arm64)  | Supported. Other glibc-based distributions should work; Alpine (musl) does not                                        |

## 3. Install the prerequisites

Follow the section for your operating system, then check the result with the commands in [3.4](#34-check-the-prerequisites).

### 3.1 Windows

1. **Git:** install [Git for Windows](https://git-scm.com/download/win) with the default options.
2. **Node.js 22:** install the **22.x LTS** Windows installer from [nodejs.org](https://nodejs.org/en/download). Keep the default options.
   - Alternatively, with [nvm-windows](https://github.com/coreybutler/nvm-windows): `nvm install 22` then `nvm use 22`.
3. **MongoDB:** install [MongoDB Community Server](https://www.mongodb.com/try/download/community) (MSI package).
   - In the installer, choose **Complete** and keep **Install MongoD as a Service** checked, so MongoDB starts with Windows.
   - MongoDB Compass (the GUI) is optional.
4. **Ollama** (real AI only): install it from [ollama.com/download](https://ollama.com/download). It runs in the system tray and starts with Windows.

**Windows notes**

- **Terminal:** use PowerShell or Git Bash. The commands in this guide work in both, except where a separate PowerShell version is shown.
- **"running scripts is disabled on this system" when running `npm`:** PowerShell's execution policy blocks `npm.ps1`. Allow local scripts for your user once:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```
- **Firewall prompt:** if Windows asks whether Node.js may communicate on networks, allowing **private networks** is enough. The app only listens on `localhost`.
- **"The specified module could not be found" for `onnxruntime` or `argon2`:** install the latest [Microsoft Visual C++ Redistributable (x64)](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist) and run `npm run setup` again.
- **Line endings:** `.gitattributes` keeps files in LF, so no Git setting is needed.

### 3.2 macOS (Apple Silicon)

1. **Command Line Tools** (provides Git): `xcode-select --install`
2. **Homebrew**, if you don't have it: follow the one-line install on [brew.sh](https://brew.sh).
3. **Node.js 22** with [nvm](https://github.com/nvm-sh/nvm) (recommended, it reads the repository's `.nvmrc`):
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
   # open a new terminal, then:
   nvm install 22
   ```
   Or with Homebrew: `brew install node@22` and follow the "add to PATH" hint it prints.
4. **MongoDB:**
   ```bash
   brew tap mongodb/brew
   brew install mongodb-community@8.0
   brew services start mongodb-community@8.0   # starts now and at every login
   ```
5. **Ollama** (real AI only): install the app from [ollama.com/download](https://ollama.com/download) and open it once; it stays in the menu bar. Or: `brew install ollama && brew services start ollama`.

**macOS notes**

- **Intel Macs** cannot run the backend (see [section 2](#2-system-requirements)).
- If `mongod` fails to start under Homebrew, check `brew services list` and the log at `$(brew --prefix)/var/log/mongodb/mongo.log`.

### 3.3 Ubuntu (22.04 / 24.04)

1. **Basic tools:**
   ```bash
   sudo apt-get update
   sudo apt-get install -y git curl gnupg build-essential
   ```
   `build-essential` is only used if a native package (`argon2`, `sharp`, `onnxruntime-node`) has no prebuilt binary for your system; it does no harm to have it.
2. **Node.js 22** with nvm:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
   source ~/.bashrc
   nvm install 22
   ```
   Don't use `apt install nodejs`: Ubuntu's own package is too old.
3. **MongoDB 8** from MongoDB's official repository (Ubuntu's `mongodb` package is outdated or missing):
   ```bash
   curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
     sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor
   # Ubuntu 24.04 is "noble"; on 22.04 replace noble with jammy
   echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | \
     sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
   sudo apt-get update
   sudo apt-get install -y mongodb-org
   sudo systemctl enable --now mongod   # MongoDB does not start on its own after install
   ```
   If these commands change, follow MongoDB's [Ubuntu install guide](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/).
4. **Ollama** (real AI only):
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```
   The script installs Ollama as a `systemd` service that starts at boot. Check it with `systemctl status ollama`.

**Ubuntu notes**

- **"ENOSPC: System limit for number of file watchers reached"** during `npm run dev`: the watch mode of NestJS and Vite needs more inotify watchers than the default.
  ```bash
  echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
  sudo sysctl -p
  ```
- **WSL2 (Ubuntu on Windows):** works like Ubuntu. Keep the repository inside the Linux file system (e.g. `~/projects`), not under `/mnt/c`, or installs and file watching become very slow. Install MongoDB and Ollama inside WSL as above.

### 3.4 Check the prerequisites

```bash
git --version
node -v          # v22.12.0 or newer
npm -v           # 10 or newer
ollama --version # real AI only
```

Check that MongoDB is running:

| OS      | Command                                                         |
| :------ | :-------------------------------------------------------------- |
| Windows | `Get-Service MongoDB` (PowerShell) shows `Running`              |
| macOS   | `brew services list` shows `mongodb-community@8.0` as `started` |
| Ubuntu  | `systemctl status mongod` shows `active (running)`              |

If `mongosh` is installed, `mongosh --eval "db.runCommand({ ping: 1 })"` should print `{ ok: 1 }`.

## 4. Get the code and install dependencies

```bash
git clone https://github.com/kunal-acquaint/ai-resume-matcher.git
cd ai-resume-matcher
npm run setup
```

`npm run setup` installs the dependencies of all workspaces (backend, frontend, shared types) and builds the shared types package. It takes a few minutes the first time.

Run every command in this guide from the repository root, unless it says otherwise.

## 5. Configure the backend

All settings live in `apps/backend/.env`, which is not committed. The frontend needs no configuration.

### 5.1 Create the file

| OS / shell              | Command                                                 |
| :---------------------- | :------------------------------------------------------ |
| macOS, Ubuntu, Git Bash | `cp apps/backend/.env.example apps/backend/.env`        |
| PowerShell              | `Copy-Item apps\backend\.env.example apps\backend\.env` |

### 5.2 Fill in the values

The example file lists every variable with an empty value. **Every line must have a value or be deleted:** an empty value such as `PORT=` is read as an empty string and fails validation at startup, while a deleted line falls back to its built-in default.

The simplest way is to replace the whole file with this template, then change the four marked values:

```dotenv
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/resume-matcher

# Auth. CHANGE: at least 32 random characters (see 5.3)
JWT_SECRET=paste-your-generated-secret-here
JWT_EXPIRES_IN=8h
LOGIN_RATE_LIMIT=5

# First admin, used only by `npm run seed:admin`. CHANGE all three.
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=choose-a-password

# AI: "stub" (stand-ins, no models needed) or "local" (MiniLM + Ollama)
AI_PROVIDER=stub
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
MODEL_CACHE_DIR=.cache/models
AI_STUB_DELAY_MS=2000

# Local LLM (Ollama), used when AI_PROVIDER=local
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
OLLAMA_NUM_CTX=8192
OLLAMA_TIMEOUT_MS=600000

# Scoring (calibrated; see project_specification.md §5.3 and §5.5)
SIM_FLOOR=0.30
SIM_CEILING=0.80
SKILL_MATCH_THRESHOLD=0.50
SCORE_WEIGHT_SEMANTIC=0.6
SCORE_WEIGHT_COVERAGE=0.4

# Frontend origin allowed by CORS
CORS_ORIGIN=http://localhost:5173
```

### 5.3 Generate `JWT_SECRET`

This command works in every terminal on every OS:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Paste the output as the value of `JWT_SECRET`. Never commit it or reuse it between machines that matter.

### 5.4 Admin values

- `ADMIN_EMAIL` must be a valid email address; it is your login.
- `ADMIN_PASSWORD` must be 8–128 characters and must not be `change-me-now`.
- These values are only read by the seed command in the next step. After the first admin exists, manage admins and passwords in the app (**Users** and **Profile** pages).

### 5.5 Settings reference

| Variable                                          | Default                                     | Notes                                                            |
| :------------------------------------------------ | :------------------------------------------ | :--------------------------------------------------------------- |
| `NODE_ENV`                                        | `development`                               | `development`, `production` or `test`                            |
| `PORT`                                            | `3000`                                      | Backend port. If you change it, see [7.3](#73-using-other-ports) |
| `MONGODB_URI`                                     | `mongodb://localhost:27017/resume-matcher`  | Any `mongodb://` or `mongodb+srv://` URI                         |
| `JWT_SECRET`                                      | (required)                                  | At least 32 characters                                           |
| `JWT_EXPIRES_IN`                                  | `8h`                                        | Session length: a number followed by `s`, `m`, `h` or `d`        |
| `LOGIN_RATE_LIMIT`                                | `5`                                         | Login attempts per IP per minute                                 |
| `AI_PROVIDER`                                     | `stub`                                      | `stub` or `local`                                                |
| `EMBEDDING_MODEL` / `MODEL_CACHE_DIR`             | `Xenova/all-MiniLM-L6-v2` / `.cache/models` | The cache path is relative to `apps/backend`                     |
| `AI_STUB_DELAY_MS`                                | `2000`                                      | Simulated extraction time in `stub` mode                         |
| `OLLAMA_URL` / `OLLAMA_MODEL`                     | `http://localhost:11434` / `llama3.2:3b`    | Where Ollama runs and which model to use                         |
| `OLLAMA_NUM_CTX` / `OLLAMA_TIMEOUT_MS`            | `8192` / `600000`                           | LLM context size and the time limit for one extraction           |
| `SIM_FLOOR` / `SIM_CEILING`                       | `0.30` / `0.80`                             | Raw similarity mapped to 0 % and 100 %; floor below ceiling      |
| `SKILL_MATCH_THRESHOLD`                           | `0.50`                                      | Minimum similarity for a semantic skill match                    |
| `SCORE_WEIGHT_SEMANTIC` / `SCORE_WEIGHT_COVERAGE` | `0.6` / `0.4`                               | Must add up to 1                                                 |
| `CORS_ORIGIN`                                     | `http://localhost:5173`                     | The frontend's address                                           |

The backend validates all values at startup and stops with a clear message naming each wrong variable.

### 5.6 Real AI: download the LLM

Skip this while you use `AI_PROVIDER=stub`.

```bash
ollama pull llama3.2:3b   # about 2 GB, once
ollama list               # should list llama3.2:3b
```

Then set `AI_PROVIDER=local` in `apps/backend/.env`. On the next backend start, the embedding model (about 23 MB) downloads into `apps/backend/.cache/models`; this takes from a few seconds to about a minute and a half on a slow connection, and later starts load it in under a second.

## 6. Create the first admin

Make sure MongoDB is running, then:

```bash
npm run seed:admin
```

You should see `Admin admin@example.com created. You can now log in.` Running it again is safe: it reports that the admin already exists and changes nothing.

## 7. Start the app

### 7.1 Development mode

```bash
npm run dev
```

This starts three processes together, with coloured prefixes: `shared` (type package in watch mode), `api` (NestJS backend) and `web` (Vite frontend). Code changes reload automatically. Stop everything with `Ctrl + C`.

The backend is ready when the `api` output shows `API listening on http://localhost:3000/api`.

| URL                              | What                                                                       |
| :------------------------------- | :------------------------------------------------------------------------- |
| http://localhost:5173            | The web app: log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`                  |
| http://localhost:3000/api/health | Health of MongoDB, the embedding model and (with the real AI) Ollama       |
| http://localhost:3000/docs       | Swagger API docs (call `POST /api/auth/login` first; the cookie is reused) |

### 7.2 Real AI: before you start

- Ollama must be running: the tray or menu bar app on Windows and macOS, the `ollama` service on Ubuntu. Check with `ollama list`.
- The first skill extraction after Ollama starts is slower because the model is loaded into memory. To warm it up: `ollama run llama3.2:3b "hi"`.
- Close heavy applications: the LLM uses all CPU cores while it extracts skills.

### 7.3 Using other ports

The frontend always runs on 5173 and stops with an error if that port is taken. To run the backend on another port, for example 3001:

1. Set `PORT=3001` in `apps/backend/.env`.
2. Point the frontend's dev proxy at it when you start:

| OS / shell              | Command                                                      |
| :---------------------- | :----------------------------------------------------------- |
| macOS, Ubuntu, Git Bash | `API_PROXY_TARGET=http://localhost:3001 npm run dev`         |
| PowerShell              | `$env:API_PROXY_TARGET="http://localhost:3001"; npm run dev` |

## 8. Check that everything works

1. Open http://localhost:3000/api/health. `status` should be `ok`, with `mongodb` and `embeddings` (and `ollama` with the real AI) marked `up`. With the real AI, `ollama` shows as `degraded` if Ollama isn't running or the model isn't pulled; the message says which.
2. Open http://localhost:5173 and log in with your admin email and password.
3. **Jobs → New job:** enter a title and paste a job description. The job shows **Extracting skills**; the skills appear after about 2 s with the stand-in AI, or 25–70 s with the real AI.
4. **Match Resume:** select the job, type a candidate name and upload a resume PDF. It must be a PDF with selectable text (not a scan), up to 5 MB. The score and skill breakdown appear in about a second.
5. Upload the same PDF again: you should see **Resume already uploaded**.
6. Open the **Dashboard** to see the stats and the resume table.

## 9. Run the tests (optional)

The tests use the stand-in AI, so they need neither Ollama nor the models, and they don't touch your database.

```bash
npm test            # unit and component tests (backend and frontend)
npm run test:e2e    # backend API tests against an in-memory MongoDB
npm run typecheck
npm run lint
npm run format:check
```

`npm run test:e2e` downloads a MongoDB binary for `mongodb-memory-server` the first time (about 80 MB, cached for later runs), so the first run needs internet and takes longer. It doesn't need your local MongoDB service.

## 10. Day-to-day commands

| Command              | What it does                                           |
| :------------------- | :----------------------------------------------------- |
| `npm run dev`        | Start shared types, backend and frontend in watch mode |
| `npm run seed:admin` | Create the first admin from `.env` (safe to re-run)    |
| `npm run build`      | Build all workspaces                                   |
| `npm test`           | Unit and component tests                               |
| `npm run test:e2e`   | Backend API tests                                      |
| `npm run typecheck`  | Type-check all workspaces                              |
| `npm run lint`       | Lint (warnings fail)                                   |
| `npm run format`     | Format all files with Prettier                         |

**After pulling new changes:** run `npm run setup` again if `package.json` or `package-lock.json` changed, then compare your `.env` with `apps/backend/.env.example` for new variables.

**Start with an empty database:** stop the app, then drop the database (all jobs, resumes and admins are deleted) and seed again:

```bash
mongosh resume-matcher --eval "db.dropDatabase()"
npm run seed:admin
```

## 11. Troubleshooting

| Problem                                                                          | Fix                                                                                                                                                                                                    |
| :------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Invalid environment configuration` at startup                                   | The message names each wrong variable. Most often a line in `.env` is empty (e.g. `PORT=`): give it a value or delete the line (see [5.2](#52-fill-in-the-values)).                                    |
| `JWT_SECRET ... is required` / `must be at least 32 characters`                  | Generate one with the command in [5.3](#53-generate-jwt_secret).                                                                                                                                       |
| `Cannot seed admin. Fix these values in apps/backend/.env`                       | Set `ADMIN_NAME`, a valid `ADMIN_EMAIL` and an 8–128 character `ADMIN_PASSWORD` other than `change-me-now`.                                                                                            |
| `connect ECONNREFUSED 127.0.0.1:27017` / backend hangs on MongoDB                | MongoDB isn't running. Start it: Windows `Start-Service MongoDB` (admin PowerShell), macOS `brew services start mongodb-community@8.0`, Ubuntu `sudo systemctl start mongod`.                          |
| `Port 5173 is already in use` or `EADDRINUSE :3000`                              | Another process uses the port, often an old `npm run dev`. Find it with `netstat -ano \| findstr :3000` (Windows) or `lsof -i :3000` (macOS, Ubuntu) and stop it, or see [7.3](#73-using-other-ports). |
| **Too many login attempts. Please try again in a minute.**                       | The rate limit (`LOGIN_RATE_LIMIT` attempts per minute) was hit. Wait one minute.                                                                                                                      |
| Job stays on **Skills needed** / extraction failed (real AI)                     | Check `http://localhost:3000/api/health`. If `ollama` is `degraded`: start Ollama, or run `ollama pull llama3.2:3b`. Then click **Re-extract with AI** on the job.                                     |
| `Cannot reach Ollama at http://localhost:11434`                                  | Ollama isn't running: open the app (Windows, macOS) or run `sudo systemctl start ollama` (Ubuntu). If it runs elsewhere, set `OLLAMA_URL`.                                                             |
| `Ollama did not finish within 600 s`                                             | The machine is too busy or too slow. Close other applications, or raise `OLLAMA_TIMEOUT_MS`.                                                                                                           |
| First start with `AI_PROVIDER=local` fails while downloading the embedding model | It needs internet once. Check the connection or proxy, delete `apps/backend/.cache/models`, and start again.                                                                                           |
| Upload rejected: **No text layer**                                               | The PDF is a scan or an image. Only PDFs with selectable text are supported (no OCR).                                                                                                                  |
| `npm install` fails building `argon2`, `sharp` or `onnxruntime-node`             | Use Node 22 (`node -v`). On Ubuntu install `build-essential`; on Windows install the Visual C++ Redistributable (see [3.1](#31-windows)). Then delete `node_modules` and run `npm run setup`.          |
| `npm run test:e2e` times out on the first run                                    | The MongoDB test binary is still downloading. Run it again on a working internet connection.                                                                                                           |
| `ENOSPC: System limit for number of file watchers reached` (Ubuntu)              | Raise the inotify limit (see [3.3](#33-ubuntu-2204--2404)).                                                                                                                                            |
| Backend crashes on startup on an Intel Mac                                       | Not supported: `onnxruntime-node` has no Intel macOS build. Use an Apple Silicon Mac, Windows or Linux.                                                                                                |
