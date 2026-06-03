<div align="center">

# 🖋️ Glyph
### A lightweight, real-time collaborative LaTeX editor.

[![GSSOC '26](https://img.shields.io/badge/GSSOC-2026-orange?style=for-the-badge&logo=github)](https://gssoc.girlscript.tech/)
[![GitHub license](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge)](https://github.com/coderanik/Glyph/blob/main/LICENSE)
[![GitHub contributors](https://img.shields.io/github/contributors/coderanik/Glyph.svg?style=for-the-badge&color=green)](https://github.com/coderanik/Glyph/graphs/contributors)
[![GitHub issues](https://img.shields.io/github/issues/coderanik/Glyph.svg?style=for-the-badge&color=red)](https://github.com/coderanik/Glyph/issues)
[![GitHub PRs](https://img.shields.io/github/issues-pr/coderanik/Glyph.svg?style=for-the-badge&color=yellow)](https://github.com/coderanik/Glyph/pulls)

<br />

<p align="center">
  <img src="https://img.shields.io/badge/Next.js_15-black?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Hono_v4-E36002?style=for-the-badge&logo=hono&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Yjs-F0DB4F?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white" />
</p>

</div>

---

## 📖 Table of Contents

- [🌌 Project Overview](#-project-overview)
- [🛑 The Problem & Solution](#-the-problem--solution)
- [⚡ Key Features](#-key-features)
- [📐 System Architecture](#-system-architecture)
- [📁 Directory Structure](#-directory-structure)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Clerk Configuration](#clerk-configuration)
  - [Environment Variables Setup](#environment-variables-setup)
  - [Quick Start Command](#quick-start-command)
  - [Alternative Workspace Installation](#alternative-workspace-installation)
- [🔍 Troubleshooting & FAQs](#-troubleshooting--faqs)
- [🤝 GirlScript Summer of Code (GSSOC) Contributors Guidelines](#-girlscript-summer-of-code-gssoc-contributors-guidelines)
  - [1. Issue Assignment Workflow](#1-issue-assignment-workflow)
  - [2. Branch Naming Standard](#2-branch-naming-standard)
  - [3. Commit Format Conventions](#3-commit-format-conventions)
  - [4. Code Quality & Formatting](#4-code-quality--formatting)
- [👑 Project Admins & Maintainers](#-project-admins--maintainers)
- [📜 License](#-license)

---

## 🌌 Project Overview

**Glyph** is an open-source, web-based collaborative LaTeX editor engineered for team productivity and speed. It provides real-time document synchronization, high-fidelity compilation inside sandboxed environment, live syntax highlighting, workspace management, and instant sharing permissions. 

Whether you are writing a research paper with peers, putting together homework assignments, or designing documentation templates, Glyph offers a distraction-free space to compose and compile TeX sources directly in your browser.

---

## 🛑 The Problem & Solution

### The Problem
1. **Host Security Risks**: Compiling user-submitted LaTeX documents directly on a host server is highly insecure. TeX packages can execute arbitrary system commands via `\write18` or perform file reads/writes, compromising host security.
2. **Synchronization Overhead**: Collaborative LaTeX writing often relies on manual Git syncs or expensive subscription models, which degrades the rapid authoring workflow.
3. **Clunky Setups**: Setting up a complete LaTeX ecosystem locally requires downloading massive packages (~5GB for `texlive-full`), configuring system environment variables, and maintaining separate compilers.

### The Glyph Solution
1. **Sandboxed compilation worker**: Compilations are handled by an isolated Docker container (`ubuntu` base + `texlive-full`) with restricted privileges, protecting the server.
2. **CRDT-based Real-time collaboration**: Integrated with [Yjs](https://yjs.dev/) and WebSocket protocols to enable seamless, low-latency, conflict-free editing, complete with active collaborator lists and cursor presence.
3. **Painless setup**: Glyph bundles dependencies inside Docker. It offers a hybrid compile capability—using host `latexmk` if installed, or falling back seamlessly to Docker compilation if not.

---

## ⚡ Key Features

*   **Real-Time Editing & Sync**: Live collaboration powered by Yjs CRDTs over WebSockets. Watch teammates make edits, select text, and move their cursors in real time.
*   **Sandboxed Background Compilation**: Compilation jobs are managed via a database-backed transaction queue (`FOR UPDATE SKIP LOCKED`) and processed in isolation.
*   **Persistent File Explorer**: Tree-structured workspace explorer supporting nested files and folders. The workspace structure is persisted inside PostgreSQL.
*   **Hybrid Compilation**: Smart compile flow. Automatically detects local host capabilities and defaults to Docker-based sandboxed compilation if TeX Live is missing locally.
*   **Access Control & Shareable Links**: Control permissions dynamically. Share read-only or collaborative (write-access) projects via unique Clerk-integrated tokens or invite collaborator IDs directly.
*   **Split Screen Previewing**: View output instantly side-by-side using the built-in PDF viewer or preview compiled LaTeX documents as live HTML.

---

## 📐 System Architecture

Glyph utilizes a decoupled modern architecture combining a monorepo workspace for frontend components, an API server, and a background queue worker.

```mermaid
graph TD
    %% User Interfacing
    Client[Next.js Client Client App]
    Editor[CodeMirror 6 / Editor]
    Client -->|WS Protocol / Cursor / Document Updates| YjsServer[Yjs WS Server Hono]
    Client -->|REST HTTP Requests| APIServer[API REST Server Hono]
    
    %% Authentication & Databases
    Clerk[Clerk Auth JWT Service] <-->|Validate Auth Tokens| APIServer
    APIServer -->|Read/Write Projects, Collaborators, Share Links| PostgreSQL[(PostgreSQL Database)]
    YjsServer -->|Persist Binary Document State as BYTEA| PostgreSQL
    
    %% Compilation Orchestration
    APIServer -->|Enqueue Compilation Job status: queued| PostgreSQL
    
    %% Sidecar worker polling
    Worker[Compile Sidecar Worker] <-->|Transaction Poll: FOR UPDATE SKIP LOCKED| PostgreSQL
    Worker -->|Write Project Source Files| TempDir[Local Workspaces: /tmp/workspaces]
    
    %% Compiling
    TempDir -->|Host Compiler| LocalTex[latexmk on Host]
    TempDir -->|Fallback Mount: /workspace| DockerContainer[Docker Sandboxed Container: glyph-compiler]
    
    LocalTex -->|Output main.pdf| Worker
    DockerContainer -->|Output main.pdf| Worker
    
    %% Save PDF back
    Worker -->|Update compilation status: success, write pdf_data BYTEA| PostgreSQL
```

---

## 📁 Directory Structure

```
Glyph/
├── .github/                 # GitHub issues, PR templates, and workflow configurations
├── docker/                  # Docker container build scripts for LaTeX compilation
│   ├── Dockerfile           # Standard Ubuntu 24.04 image + TeX Live full suite
│   └── worker.sh            # Safe bash script parsing TeX parameters & running latexmk
├── frontend/                # Next.js Frontend application (TypeScript, Tailwind CSS v4)
│   ├── src/
│   │   ├── app/             # Application pages (Landing, Dashboard, Profile, Editor)
│   │   ├── components/      # UI components (Editor, PdfViewer, ShareModal, Sidebar)
│   │   ├── lib/             # API client, compile triggers, and network helpers
│   │   └── types/           # Core typescript interfaces (Project, File, Collaborator)
│   └── public/              # Global static files and images
├── server/                  # Hono Backend REST API & WebSockets server (Node.js, TypeScript)
│   ├── src/
│   │   ├── config/          # Configurations: environment variables, DB client, Yjs sockets
│   │   ├── controllers/     # Controller handlers orchestrating database modifications
│   │   ├── routes/          # REST Endpoint declarations (Auth, Projects, Collaborators)
│   │   ├── compileWorker.ts # Queue listener sidecar polling and running LaTeX builds
│   │   └── index.ts         # Server boot script listening to API requests & WebSockets
├── scripts/                 # Utility scripts for development
│   └── dev.sh               # Pre-flight environment verifier and auto-start manager
├── docker-compose.yml       # Configuration to spin up database locally
├── package.json             # Root npm workspace configuration (Monorepo setup)
└── package-lock.json        # Locked packages for monorepo consistency
```

---

## 🛠️ Tech Stack

### Frontend
*   **Framework**: **Next.js 15 (App Router)** for rapid server-side hydration, path routing, and high-performance client applications.
*   **Language**: **TypeScript** to enforce robust type-safety across components.
*   **Styling**: **Tailwind CSS v4** featuring modern utility variables, flexbox structures, and dark/light system color palettes.
*   **Editor Engine**: **CodeMirror 6** for extensible syntax highlighting, lines rendering, linting, and plugin support.
*   **State Sync**: **Yjs** implementing conflict-free replicated data types (CRDTs) to sync editor models.

### Backend
*   **API Framework**: **Hono v4 (Node.js)** for lightweight, fast HTTP route handling and WebSockets server gateway.
*   **Document Synchronization**: **Y-Websocket** server provider managing WebSocket updates, synchronizing document vectors, and writing binary states back to database.
*   **Database Client**: **node-postgres (`pg`)** using connection pooling for optimized, concurrent queries.

### Infra & Services
*   **Database**: **PostgreSQL** storing user files, access roles, project hierarchies, and raw PDF data.
*   **Authentication**: **Clerk Auth** providing secure login flow, profile controls, session persistence, and organization validation.
*   **Isolation**: **Docker** creating a sandboxed, dependency-secure Linux environment (`ubuntu` base + `texlive-full` build tools) for compiling LaTeX source trees safely.

---

## 🚀 Getting Started

Follow the guide below to set up your local development environment.

### Prerequisites

Ensure you have the following installed:
*   **Node.js**: `v20.x` or later.
*   **Docker Desktop**: Required to execute safe compiles. Ensure Docker is running.
*   **PostgreSQL**: Local database instance or a remote instance (e.g. Supabase).
*   **Clerk Account**: Free account to manage user authentication.

---

### Clerk Configuration

Before running Glyph, you must register a project with Clerk:
1. Go to the [Clerk Dashboard](https://dashboard.clerk.com/) and create a new application.
2. Select **Email** and **GitHub/Google** as social providers.
3. Once created, copy the **Publishable Key** and **Secret Key**.
4. In the Clerk dashboard, set your redirect URLs:
   - Sign In: `http://localhost:3000/sign-in`
   - Sign Up: `http://localhost:3000/sign-up`
   - After Sign In: `http://localhost:3000/dashboard`
   - After Sign Out: `http://localhost:3000/`

---

### Environment Variables Setup

Configure `.env` files in both the frontend and backend workspace folders.

#### 1. Backend Config
Create a file named `server/.env` and configure:
```env
# Server Port (Hono defaults)
PORT=8083

# Clerk Keys (retrieve from Clerk dashboard under API Keys)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database url connection string (local postgres or Supabase)
DATABASE_URL=postgresql://postgres:password@localhost:5432/glyph

# Node Environment
NODE_ENV=development
```

#### 2. Frontend Config
Create a file named `frontend/.env.local` and configure:
```env
# Clerk Keys (retrieve from Clerk dashboard under API Keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Hono API Endpoint
NEXT_PUBLIC_API_URL=http://localhost:8083

# Clerk Auth Navigation Targets
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

---

### Quick Start Command

Glyph provides an interactive shell command that checks your Node.js version, ensures Docker is running, installs monorepo dependencies, builds the LaTeX compiler container, and runs all development servers concurrently.

```bash
# Make the helper script executable
chmod +x scripts/dev.sh

# Spin up the environment
./scripts/dev.sh
```

---

### Alternative Workspace Installation

If you prefer to install dependencies and run components manually:

#### 1. Install Workspace Dependencies
Run this command in the project root to install dependencies for the frontend and server concurrently using npm workspaces:
```bash
npm install
```

#### 2. Start PostgreSQL via Docker Compose (Optional)
If you don't have a local PostgreSQL running, you can spin up the built-in instance:
```bash
npm run db:up
```
*Note: This starts PostgreSQL on port `5432` with username `postgres` and password `password`. The database schema will be automatically created on backend start!*

#### 3. Build the LaTeX Compiler Container
```bash
docker build -t glyph-compiler ./docker
```

#### 4. Spin up Servers Concurrently
Run all services (Next.js client, Hono API server, and compile worker sidecar) together:
```bash
npm run dev
```

*   **Frontend client application**: Available at [http://localhost:3000](http://localhost:3000)
*   **Hono server endpoints**: Available at [http://localhost:8083](http://localhost:8083)

---

## 🔍 Troubleshooting & FAQs

### Q1: Compilation fails immediately with "main.pdf was not produced by latexmk"
*   **Cause**: This happens if your `main.tex` file contains compilation errors or misses structural definitions.
*   **Resolution**: Check the "Logs" pane in the editor sidebar. It details the line numbers and LaTeX compiling errors thrown by `latexmk`.

### Q2: Docker worker throws permission errors / fails to connect to socket (Linux/Mac)
*   **Cause**: Your user account does not have sufficient permission to access the Docker daemon socket (`/var/run/docker.sock`).
*   **Resolution**: Ensure Docker Desktop is running. On Linux hosts, add your user to the docker group:
    ```bash
    sudo usermod -aG docker $USER
    ```
    After updating group permissions, restart your shell or computer for changes to take effect.

### Q3: Clerk triggers authentication loops or redirection errors
*   **Cause**: Missed matching Clerk environment variables in `frontend/.env.local` or Clerk settings.
*   **Resolution**: Verify that `NEXT_PUBLIC_CLERK_SIGN_IN_URL` is set to `/sign-in` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL` is set to `/sign-up`, and match these targets inside the Clerk dashboard settings.

### Q4: Database connection failed (pg Pool connection timeout)
*   **Cause**: The Hono server cannot establish connection with PostgreSQL.
*   **Resolution**: Ensure PostgreSQL is up and accepting connections on port 5432. Double-check your `DATABASE_URL` credentials inside `server/.env`.

---

## 🤝 GirlScript Summer of Code (GSSOC) Contributors Guidelines

Welcome to **GSSOC '26**! 🎉 We are excited to collaborate with you to build Glyph. To ensure a smooth experience, please follow these guidelines strictly:

### 1. Issue Assignment Workflow
*   **Never work on unassigned issues**: Pull Requests referencing issues that are not formally assigned to you by a Project Admin/Mentor will not be accepted.
*   **Claiming an issue**: Browse the [Issues](https://github.com/coderanik/Glyph/issues) list, identify an open item, and comment on it stating why you would like to tackle it.
*   **Timeout rule**: Assigned issues must have progress shown within **3 days**. If there are no updates or code submissions, the issue will be unassigned and reassigned to other waiting contributors.

### 2. Branch Naming Standard
Create a dedicated branch from the latest upstream `main` for every issue. Name your branch using the format below:
```text
feature/issue-[issue-number]-[brief-description]
fix/issue-[issue-number]-[brief-description]
docs/issue-[issue-number]-[brief-description]
```
*Example: `feature/issue-42-dark-mode-toggle`*

### 3. Commit Format Conventions
We use [Conventional Commits](https://www.conventionalcommits.org/) standards. This helps keep our git log clean and readable:
*   `feat: <description>`: Introducing a new feature.
*   `fix: <description>`: Fixing a bug.
*   `docs: <description>`: Writing or updating documentation (e.g. README updates).
*   `refactor: <description>`: Modifying code without adding features or fixing bugs.
*   `style: <description>`: Formatting adjustments, whitespace cleanup, or missing semi-colons.
*   `chore: <description>`: General maintenance tasks, package updates, or CLI scripts.

*Example commit: `git commit -m "feat: add real-time active users list component"`*

### 4. Code Quality & Formatting
*   **Linting**: Verify that all files adhere to lint configurations prior to opening a PR.
    ```bash
    # Run in frontend folder
    npm run lint
    # Check types in server folder
    npm run type-check:server
    ```
*   **Clean PRs**: Always create self-contained Pull Requests. One PR should solve exactly one issue. Do not bundle multiple unrelated features into a single PR.

---

## 👑 Project Admins & Maintainers

| Profile | Role | Contact Channels |
| :---: | :---: | :---: |
| **Anik** | **Project Admin & Creator** | [![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/coderanik) [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://linkedin.com/in/anik-code) |

---

## 📜 License

Distributed under the **Apache License 2.0**. See the [LICENSE](file:///Users/anik/Code/Glyph/LICENSE) file in the root directory for more details.

---

<div align="center">
  <h3>Show some love! ⭐</h3>
  If you find Glyph helpful or plans to contribute, consider starring the repository to support our open-source growth!
</div>
