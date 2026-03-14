# Glyph

A lightweight, collaborative LaTeX editor built with Rust, Next.js, and Tauri.

## Tech Stack
- **Backend:** Rust (Axum, Tokio, SQLx, Redis, Yrs, Bollard)
- **Frontend:** Next.js, TypeScript, Tailwind CSS, Yjs, CodeMirror 6
- **Desktop:** Tauri
- **Database:** PostgreSQL
- **Infrastructure:** Docker (for local DB and compilation workers)

## Project Structure
- `backend/`: Axum API server.
- `frontend/`: Next.js web application.
- `desktop/`: Tauri desktop wrapper.
- `docker/`: Dockerfiles for compilation workers.
- `docs/`: API and architecture documentation.
- `scripts/`: Development helper scripts.

## Getting Started

### Prerequisites
- Rust & Cargo
- Node.js & npm
- Docker Desktop

### Quick Start (Parent Folder)
1. **Prepare Environment:**
   ```bash
   cp .env.example .env # If provided, or ensure .env exists
   ```
2. **Start Infrastructure:**
   ```bash
   npm run db:up
   ```
3. **Run Web Version:**
   ```bash
   npm run dev
   ```
4. **Run Desktop Version:**
   ```bash
   npm run tauri:dev
   ```
5. **Run Backend (Optional for standalone testing):**
   ```bash
   npm run backend:dev
   ```

## Local Development
Use the provided script for a one-stop-shop:
```bash
./scripts/dev.sh
```

## Features (Phase 0)
- [x] Monorepo structure
- [x] Next.js 15 App Router Integration
- [x] Shared Rust Backend Models & State
- [x] Real-time Collaborative Editing (Local/WebRTC demo)
- [x] Tauri Desktop Integration
- [x] PostgreSQL & Redis Docker setup
- [x] CI/CD Pipeline Foundation
