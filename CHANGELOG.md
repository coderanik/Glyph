# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-06-10

## What's New
- **Initial release of Glyph**: A lightweight, real-time collaborative LaTeX editor engineered for team productivity and speed.
- **Real-Time Editing & Sync**: Live collaboration powered by Yjs CRDTs over WebSockets. Watch teammates make edits, select text, and move cursors in real time.
- **Sandboxed Background Compilation**: Secure compilation handled by isolated Docker containers (`ubuntu` base + `texlive-full`) with restricted privileges.
- **Persistent File Explorer**: Tree-structured workspace explorer supporting nested files and folders, persisted in PostgreSQL.
- **Hybrid Compilation**: Smart compile flow that auto-detects host capabilities (uses local `latexmk` if installed, or falls back to Docker-based compilation).
- **Access Control & Shareable Links**: Control permissions dynamically. Share read-only or collaborative projects via unique Clerk-integrated tokens.
- **Split Screen Previewing**: View output instantly side-by-side using the built-in PDF viewer or preview compiled LaTeX documents as live HTML.

## Installation

### Prerequisites
- **Node.js**: `v20.x` or later.
- **Docker Desktop**: Required for PostgreSQL and LaTeX compilation.
- **Clerk Account**: Free account to manage user authentication.

### Setup Steps
1. **Environment Variables**:
   Copy the example environment file and populate your Clerk credentials:
   ```bash
   cp .env.example .env
   ```
2. **Start the Stack (Docker Compose - Recommended)**:
   ```bash
   # Build all service images
   docker compose build

   # Start the entire stack in detached mode
   docker compose up -d
   ```
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **Backend**: [http://localhost:8083](http://localhost:8083)

3. **Alternative Quick Start (Local Development)**:
   Make sure you start PostgreSQL (`docker compose up db -d`), then run:
   ```bash
   npm install
   chmod +x scripts/dev.sh
   ./scripts/dev.sh
   ```
