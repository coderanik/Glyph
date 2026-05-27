<div align="center">
  <h1>Glyph</h1>
  <p>A lightweight, real-time collaborative LaTeX editor.</p>
</div>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white" />
</p>

## Overview

**Glyph** is an open-source, web-based collaborative LaTeX editor. Write documents seamlessly with your peers using real-time synchronization, compile beautiful PDFs via a sandboxed Docker worker, and manage all your projects from a sleek, minimalist dashboard.

## Key Features

- **Real-Time Collaboration**: Co-author LaTeX documents live. Powered by Yjs and WebSockets.
- **Sleek Interface**: Distraction-free editing environment, dark/light mode persistence, and seamless file exploration.
- **Secure Compilation**: Background LaTeX compilation inside sandboxed Docker containers.
- **Access Control**: Share read-only or collaborative links with fine-grained access powered by Clerk authentication.
- **Instant Preview**: Live HTML previews alongside traditional PDF compilation.

## Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (App Router), TypeScript, Tailwind CSS v4, CodeMirror 6, Yjs.
- **Backend**: [Hono](https://hono.dev/) (Node.js), TypeScript.
- **Database**: PostgreSQL (via `pg` pooling).
- **Compilation Engine**: Docker (Ubuntu, TeX Live).
- **Authentication**: [Clerk](https://clerk.com/).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (required for LaTeX compilation)
- A [Clerk](https://clerk.com/) Account
- A PostgreSQL Database (e.g., local, Docker, or [Supabase](https://supabase.com/))

### Environment Setup

Create `.env` files in both the `frontend` and `server` directories.

**frontend/.env.local**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8083
```

**server/.env**
```env
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql://user:password@localhost:5432/glyph
```

### Installation

We provide a convenient script to install dependencies, build the Docker image, and run both servers simultaneously.

```bash
chmod +x scripts/dev.sh
./scripts/dev.sh
```

Alternatively, you can run them manually:
1. `docker build -t glyph-compiler ./docker`
2. `cd server && npm install && npm run dev`
3. `cd frontend && npm install && npm run dev`

The app will be available at [http://localhost:3000](http://localhost:3000).

## Contributing

Contributions are always welcome! Whether it's adding new features, reporting bugs, or improving documentation, please feel free to open a Pull Request or an Issue.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.
