use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use crate::models::{Project, File, Claims as AuthClaims};
use crate::state::AppState;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub is_public: Option<bool>,
}

pub async fn create_project(
    claims: AuthClaims,
    State(state): State<AppState>,
    Json(payload): Json<CreateProjectRequest>,
) -> impl IntoResponse {
    let project = sqlx::query_as::<_, Project>(
        "INSERT INTO projects (name, owner_id, is_public) VALUES ($1, $2, $3) RETURNING *"
    )
    .bind(payload.name)
    .bind(claims.sub)
    .bind(payload.is_public.unwrap_or(false))
    .fetch_one(&state.db)
    .await;

    match project {
        Ok(p) => (StatusCode::CREATED, Json(p)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to create project: {}", e)).into_response(),
    }
}

pub async fn list_projects(
    claims: AuthClaims,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let projects = sqlx::query_as::<_, Project>(
        "SELECT * FROM projects WHERE owner_id = $1 OR id IN (SELECT project_id FROM collaborators WHERE user_id = $1)"
    )
    .bind(claims.sub)
    .fetch_all(&state.db)
    .await;

    match projects {
        Ok(p) => Json(p).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to list projects: {}", e)).into_response(),
    }
}

#[derive(Deserialize)]
pub struct CreateFileRequest {
    pub name: String,
    pub path: String,
    pub content: Option<String>,
}

pub async fn create_file(
    claims: AuthClaims,
    Path(project_id): Path<Uuid>,
    State(state): State<AppState>,
    Json(payload): Json<CreateFileRequest>,
) -> impl IntoResponse {
    // Check permission
    let has_permission = check_project_permission(&state, project_id, claims.sub).await;
    if !has_permission {
        return (StatusCode::FORBIDDEN, "Forbidden").into_response();
    }

    let file = sqlx::query_as::<_, File>(
        "INSERT INTO files (project_id, name, path, content) VALUES ($1, $2, $3, $4) RETURNING *"
    )
    .bind(project_id)
    .bind(payload.name)
    .bind(payload.path)
    .bind(payload.content.map(|c| c.into_bytes()))
    .fetch_one(&state.db)
    .await;

    match file {
        Ok(f) => (StatusCode::CREATED, Json(f)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to create file: {}", e)).into_response(),
    }
}

pub async fn get_project_files(
    claims: AuthClaims,
    Path(project_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let has_permission = check_project_permission(&state, project_id, claims.sub).await;
    if !has_permission {
        return (StatusCode::FORBIDDEN, "Forbidden").into_response();
    }

    let files = sqlx::query_as::<_, File>(
        "SELECT id, project_id, name, path, created_at, updated_at FROM files WHERE project_id = $1"
    )
    .bind(project_id)
    .fetch_all(&state.db)
    .await;

    match files {
        Ok(f) => Json(f).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to list files: {}", e)).into_response(),
    }
}

pub async fn update_file_content(
    claims: AuthClaims,
    Path((_project_id, file_id)): Path<(Uuid, Uuid)>,
    State(state): State<AppState>,
    Json(content): Json<String>,
) -> impl IntoResponse {
    // In a real app, we'd verify project_id matches and user has permission
    // For now, simple update
    let result = sqlx::query(
        "UPDATE files SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2"
    )
    .bind(content.into_bytes())
    .bind(file_id)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => StatusCode::OK.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update file: {}", e)).into_response(),
    }
}

async fn check_project_permission(state: &AppState, project_id: Uuid, user_id: Uuid) -> bool {
    let row: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM projects WHERE id = $1 AND (owner_id = $2 OR is_public = true)
         UNION ALL
         SELECT COUNT(*) FROM collaborators WHERE project_id = $1 AND user_id = $2"
    )
    .bind(project_id)
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or((0,));

    row.0 > 0
}
