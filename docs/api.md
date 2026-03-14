# Glyph API Contracts

## Overview
Glyph uses a RESTful API for standard CRUD operations and authentication, supplemented by WebSocket connections (via Yjs `y-webrtc` or a custom `y-websocket` Axum backend) for real-time collaborative editing.

## Endpoints

### Authentication
- `POST /api/auth/register` (Email/Pass)
- `POST /api/auth/login` -> Returns JWT
- `GET /api/auth/oauth/google` -> Redirects to Google OAuth
- `GET /api/auth/oauth/github` -> Redirects to GitHub OAuth
- `POST /api/auth/refresh` -> Refresh JWT

### Users
- `GET /api/users/me` -> Get current user profile
- `PUT /api/users/me` -> Update user profile

### Projects
- `GET /api/projects` -> List all projects user owns or has access to
- `POST /api/projects` -> Create new LaTeX project
- `GET /api/projects/:id` -> Get project metadata
- `PUT /api/projects/:id` -> Update project settings (is_public, name)
- `DELETE /api/projects/:id` -> Delete project

### Files (LaTeX, Images, Bibliography)
- `GET /api/projects/:id/files` -> List files in project
- `POST /api/projects/:id/files` -> Create new file (empty or upload)
- `GET /api/projects/:id/files/:file_id` -> Get file content
- `PUT /api/projects/:id/files/:file_id` -> Update file content (fallback if not using WS)
- `DELETE /api/projects/:id/files/:file_id` -> Delete file

### Collaborators
- `GET /api/projects/:id/collaborators` -> List collaborators
- `POST /api/projects/:id/collaborators` -> Add collaborator via email
- `DELETE /api/projects/:id/collaborators/:user_id` -> Remove collaborator

### Compilation
- `POST /api/projects/:id/compile` -> Trigger a new TeX compilation job
- `GET /api/projects/:id/compile/:job_id` -> Poll compilation status
- `GET /api/projects/:id/compile/:job_id/logs` -> Get latexmk output
- `GET /api/projects/:id/compile/:job_id/download` -> Download resulting PDF

## WebSocket / Real-Time Editing
WebSocket path: `wss://api.glyph.com/ws/:project_id`
- Managed via `y-websocket` (Rust port using `yrs` and Axum WebSockets).
- Handles cursor broadcasting and document state synchronizations.

## Data Models
See `backend/migrations/` for exact database SQL schema definitions.
