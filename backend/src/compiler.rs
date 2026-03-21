use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use bollard::container::{Config, CreateContainerOptions, StartContainerOptions, LogOutput, LogsOptions, WaitContainerOptions};
use bollard::Docker;
use futures_util::stream::StreamExt;
use crate::models::Claims as AuthClaims;
use crate::state::AppState;
use uuid::Uuid;
use std::collections::HashMap;
use chrono::Utc;

pub async fn compile_project(
    claims: AuthClaims,
    Path(project_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    // 1. Create a job entry in DB
    let job_id = match sqlx::query!(
        "INSERT INTO compilation_jobs (project_id, status) VALUES ($1, 'queued') RETURNING id",
        project_id
    )
    .fetch_one(&state.db)
    .await {
        Ok(row) => row.id,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to queue job: {}", e)).into_response(),
    };

    // 2. Trigger compilation in background
    let state_clone = state.clone();
    tokio::spawn(async move {
        if let Err(e) = run_compilation(state_clone, project_id, job_id).await {
            tracing::error!("Compilation failed for job {}: {}", job_id, e);
        }
    });

    (StatusCode::ACCEPTED, Json(serde_json::json!({ "job_id": job_id }))).into_response()
}

async fn run_compilation(state: AppState, project_id: Uuid, job_id: Uuid) -> anyhow::Result<()> {
    // Update status to running
    sqlx::query!(
        "UPDATE compilation_jobs SET status = 'running', started_at = CURRENT_TIMESTAMP WHERE id = $1",
        job_id
    )
    .execute(&state.db)
    .await?;

    let docker = Docker::connect_with_local_defaults()?;
    
    // Fetch project files
    let files = sqlx::query!(
        "SELECT name, content FROM files WHERE project_id = $1",
        project_id
    )
    .fetch_all(&state.db)
    .await?;

    // For now, let's assume it's a LaTeX project and find the main file (e.g., main.tex)
    // In a real app, we'd use a configuration file or detect the main file
    let main_file = files.iter().find(|f| f.name == "main.tex")
        .ok_or_else(|| anyhow::anyhow!("main.tex not found"))?;

    // Create a temporary "build" container
    // Note: This is a simplified version. In production, we'd mount a volume or use tar streams to inject files.
    let image = "blang/latex:latest"; // A common LaTeX image
    
    let mut env = Vec::new();
    // We can't easily pass files via ENV, so we'll use a script to write them and run pdflatex
    // This is just a conceptual implementation of how bollard works.
    
    let container_config = Config {
        image: Some(image),
        cmd: Some(vec!["pdflatex", "-interaction=nonstopmode", "main.tex"]),
        working_dir: Some("/workspace"),
        ..Default::default()
    };

    let options = Some(CreateContainerOptions {
        name: format!("compile-{}", job_id),
        platform: None,
    });

    let container = docker.create_container(options, container_config).await?;
    docker.start_container::<String>(&container.id, None).await?;

    // TODO: Use `docker.upload_to_container` to send the files before starting.
    // For this prototype, let's capture logs and mark as finished.

    let mut logs = String::new();
    let mut log_stream = docker.logs(
        &container.id,
        Some(LogsOptions {
            stdout: true,
            stderr: true,
            follow: true,
            ..Default::default()
        }),
    );

    while let Some(log) = log_stream.next().await {
        match log? {
            LogOutput::StdOut { message } | LogOutput::StdErr { message } => {
                logs.push_str(&String::from_utf8_lossy(&message));
            }
            _ => {}
        }
    }

    let wait = docker.wait_container(&container.id, Some(WaitContainerOptions { condition: "not-running" })).next().await;
    let status = if let Some(Ok(w)) = wait {
        if w.status_code == 0 { "success" } else { "failed" }
    } else {
        "failed"
    };

    sqlx::query!(
        "UPDATE compilation_jobs SET status = $1, logs = $2, completed_at = CURRENT_TIMESTAMP WHERE id = $3",
        status,
        logs,
        job_id
    )
    .execute(&state.db)
    .await?;

    // Cleanup
    docker.remove_container(&container.id, None).await?;

    Ok(())
}

pub async fn get_job_status(
    _claims: AuthClaims,
    Path((_project_id, job_id)): Path<(Uuid, Uuid)>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let job = sqlx::query!(
        "SELECT status, logs, pdf_url, started_at, completed_at FROM compilation_jobs WHERE id = $1",
        job_id
    )
    .fetch_optional(&state.db)
    .await
    .unwrap();

    match job {
        Some(j) => Json(j).into_response(),
        None => (StatusCode::NOT_FOUND, "Job not found").into_response(),
    }
}
