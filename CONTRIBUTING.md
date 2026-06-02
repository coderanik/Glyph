# Contributing to Glyph

First off, thank you for considering contributing to Glyph! 🎉 Every contribution matters — whether it's fixing a typo, reporting a bug, suggesting a feature, or submitting a pull request.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior by opening an issue.

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/Glyph.git
   cd Glyph
   ```
3. **Add the upstream remote:**
   ```bash
   git remote add upstream https://github.com/coderanik/Glyph.git
   ```

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (for LaTeX compilation)
- A [Clerk](https://clerk.com/) account (for authentication)
- A PostgreSQL database (local, Docker, or [Supabase](https://supabase.com/))

### Environment Variables

Copy the example environment files and fill in your values:

```bash
cp frontend/.env.example frontend/.env.local
cp server/.env.example server/.env
```

### Install & Run

From the project root:

```bash
# Install all dependencies (frontend + server)
npm install

# Build the LaTeX compiler Docker image
docker build -t glyph-compiler ./docker

# Start the database (if using Docker Compose)
npm run db:up

# Start the backend server (port 8083)
npm run server:dev

# In another terminal, start the frontend (port 3000)
npm run dev
```

Or use the convenience script:

```bash
chmod +x scripts/dev.sh
./scripts/dev.sh
```

## Project Structure

```
Glyph/
├── frontend/           # Next.js frontend (App Router, TypeScript)
│   ├── src/
│   │   ├── app/        # Next.js pages and layouts
│   │   ├── components/ # Reusable React components
│   │   ├── lib/        # Utility functions and helpers
│   │   └── types/      # TypeScript type definitions
│   └── public/         # Static assets
├── server/             # Hono backend (Node.js, TypeScript)
│   └── src/
│       ├── config/     # Database, environment, and Yjs config
│       ├── controllers/# Route handler logic
│       └── routes/     # API route definitions
├── docker/             # LaTeX compiler Docker image
├── scripts/            # Development utility scripts
└── .github/            # CI workflows and issue templates
```

## How to Contribute

### 1. Find an Issue

- Browse the [Issues](https://github.com/coderanik/Glyph/issues) page.
- Look for issues labeled `good first issue` or `help wanted`.
- Comment on the issue to let others know you're working on it.

### 2. Create a Branch

Create a feature branch from `main`:

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

Use a descriptive branch name:
- `feature/dark-mode-toggle`
- `fix/compilation-timeout`
- `docs/update-readme`

### 3. Make Your Changes

- Write clean, readable code.
- Follow the existing code style and patterns.
- Add or update tests if applicable.
- Update documentation if your change affects the public API or user experience.

### 4. Test Your Changes

```bash
# Lint the frontend
cd frontend && npm run lint

# Type-check the server
cd server && npx tsc --noEmit

# Build both projects
npm run build
```

### 5. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git commit -m "feat: add real-time cursor presence indicators"
git commit -m "fix: resolve PDF download timeout on large documents"
git commit -m "docs: add Docker troubleshooting section to README"
```

We loosely follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — A new feature
- `fix:` — A bug fix
- `docs:` — Documentation changes
- `style:` — Code style changes (formatting, no logic change)
- `refactor:` — Code refactoring (no feature or bug fix)
- `test:` — Adding or updating tests
- `chore:` — Build process, tooling, or dependency updates

### 6. Push and Open a PR

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request against the `main` branch on GitHub.

## Pull Request Process

1. Fill out the pull request template completely.
2. Ensure all CI checks pass (lint, type-check, build).
3. Link any related issues using `Closes #123` or `Fixes #123`.
4. Request a review from a maintainer.
5. Be responsive to feedback — we aim to review PRs within a few days.
6. Once approved, a maintainer will merge your PR.

## Coding Standards

### TypeScript

- Use strict TypeScript — avoid `any` where possible.
- Prefer `const` over `let`; never use `var`.
- Use meaningful variable and function names.
- Add type annotations to function parameters and return types.

### React / Next.js (Frontend)

- Use functional components with hooks.
- Keep components focused and single-purpose.
- Colocate styles with components where practical.
- Use `useCallback` and `useMemo` for expensive computations.

### Hono (Server)

- Keep controllers thin — extract business logic into services.
- Always validate and sanitize user input.
- Use proper HTTP status codes.
- Handle errors gracefully with try/catch.

### General

- Keep files under 300 lines when possible.
- Remove unused imports and dead code.
- Write comments for non-obvious logic, not for obvious code.

## Reporting Bugs

Use the [Bug Report](https://github.com/coderanik/Glyph/issues/new?template=bug_report.md) issue template. Include:

- **A clear title** describing the bug.
- **Steps to reproduce** — be as specific as possible.
- **Expected behavior** vs. **actual behavior**.
- **Screenshots or logs** if applicable.
- **Environment details** (OS, browser, Node.js version).

## Suggesting Features

Use the [Feature Request](https://github.com/coderanik/Glyph/issues/new?template=feature_request.md) issue template. Include:

- **A clear title** describing the feature.
- **The problem** this feature would solve.
- **Your proposed solution** — describe what you'd like to see.
- **Alternatives considered** — other approaches you've thought about.

## Community

- ⭐ Star the repository if you find it useful!
- 🐛 Report bugs and request features via [Issues](https://github.com/coderanik/Glyph/issues).
- 💬 Discuss ideas and ask questions in [Discussions](https://github.com/coderanik/Glyph/discussions) (if enabled).

---

Thank you for helping make Glyph better! 🚀
