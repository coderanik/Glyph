use axum::{
    body::Body,
    extract::{Path, State},
    http::{header, StatusCode},
    response::IntoResponse,
    Json,
};
use bollard::container::{
    Config, CreateContainerOptions, DownloadFromContainerOptions, LogOutput, LogsOptions,
    UploadToContainerOptions, WaitContainerOptions,
};
use bollard::Docker;
use bytes::Bytes;
use futures_util::StreamExt;
use std::io::Read;
use std::path::{Path as StdPath, PathBuf};
use yrs::updates::decoder::Decode;
use yrs::{Doc, GetString, Transact, Update};

use crate::models::Claims as AuthClaims;
use crate::projects::check_project_permission;
use crate::state::AppState;
use serde::Serialize;
use sqlx::FromRow;
use uuid::Uuid;

pub async fn compile_project(
    claims: AuthClaims,
    Path(project_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let has_permission = check_project_permission(&state, project_id, claims.sub).await;
    if !has_permission {
        return (StatusCode::FORBIDDEN, "Forbidden").into_response();
    }

    let job_id = match sqlx::query!(
        "INSERT INTO compilation_jobs (project_id, status) VALUES ($1, 'queued') RETURNING id",
        project_id
    )
    .fetch_one(&state.db)
    .await
    {
        Ok(row) => row.id,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to queue job: {}", e),
            )
                .into_response();
        }
    };

    let state_clone = state.clone();
    tokio::spawn(async move {
        if let Err(e) = run_compilation(state_clone, project_id, job_id).await {
            tracing::error!("Compilation failed for job {}: {}", job_id, e);
        }
    });

    (StatusCode::ACCEPTED, Json(serde_json::json!({ "job_id": job_id }))).into_response()
}

#[derive(Debug, FromRow)]
struct FileForCompile {
    id: Uuid,
    name: String,
    path: String,
    content: Option<Vec<u8>>,
}

fn rel_path_in_workspace(f: &FileForCompile) -> String {
    let p = f.path.trim();
    if !p.is_empty() {
        p.trim_start_matches('/').replace('\\', "/")
    } else {
        f.name.clone()
    }
}

fn main_tex_relative(files: &[FileForCompile]) -> Option<String> {
    files
        .iter()
        .find(|f| {
            let rel = rel_path_in_workspace(f);
            rel == "main.tex" || rel.ends_with("/main.tex") || f.name == "main.tex"
        })
        .map(rel_path_in_workspace)
}

fn pdf_path_for_main_tex(main_tex: &str) -> String {
    StdPath::new(main_tex)
        .with_extension("pdf")
        .to_string_lossy()
        .replace('\\', "/")
}

fn bytes_to_tex_source(bytes: &[u8]) -> String {
    if bytes.is_empty() {
        return String::new();
    }
    if let Ok(update) = Update::decode_v1(bytes) {
        let doc = Doc::new();
        let mut txn = doc.transact_mut();
        txn.apply_update(update);
        drop(txn);
        let txt = doc.get_or_insert_text("codemirror");
        return txt.get_string(&doc.transact());
    }
    String::from_utf8_lossy(bytes).to_string()
}

async fn resolved_tex_source(
    state: &AppState,
    file_id: Uuid,
    db_content: Option<Vec<u8>>,
) -> String {
    if let Some(entry) = state.session_store.get(&file_id) {
        let awareness = entry.value();
        let guard = awareness.read().await;
        let doc = guard.doc();
        let txt = doc.get_or_insert_text("codemirror");
        return txt.get_string(&doc.transact());
    }
    bytes_to_tex_source(db_content.as_deref().unwrap_or(&[]))
}

fn build_workspace_tar(files: &[FileForCompile], sources: &[String]) -> anyhow::Result<Vec<u8>> {
    let mut buf = Vec::new();
    {
        let mut ar = tar::Builder::new(&mut buf);
        for (f, src) in files.iter().zip(sources.iter()) {
            let rel = rel_path_in_workspace(f);
            if rel.is_empty() {
                continue;
            }
            let data = src.as_bytes();
            let mut header = tar::Header::new_gnu();
            header.set_path(&rel)?;
            header.set_size(data.len() as u64);
            header.set_mode(0o644);
            header.set_cksum();
            ar.append(&header, data)?;
        }
        ar.finish()?;
    }
    Ok(buf)
}

fn artifact_dir() -> PathBuf {
    std::env::var("GLYPH_ARTIFACT_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("artifacts"))
}

fn artifact_pdf_path(job_id: Uuid) -> PathBuf {
    artifact_dir().join(format!("{}.pdf", job_id))
}

fn pdf_api_path(project_id: Uuid, job_id: Uuid) -> String {
    format!("/projects/{}/jobs/{}/pdf", project_id, job_id)
}

async fn run_compilation(state: AppState, project_id: Uuid, job_id: Uuid) -> anyhow::Result<()> {
    if let Err(e) = state.persist_sessions().await {
        tracing::warn!("persist_sessions before compile: {}", e);
    }

    sqlx::query!(
        "UPDATE compilation_jobs SET status = 'running', started_at = CURRENT_TIMESTAMP WHERE id = $1",
        job_id
    )
    .execute(&state.db)
    .await?;

    let docker = Docker::connect_with_local_defaults()?;

    let files = sqlx::query_as::<_, FileForCompile>(
        "SELECT id, name, path, content FROM files WHERE project_id = $1",
    )
    .bind(project_id)
    .fetch_all(&state.db)
    .await?;

    let main_rel = main_tex_relative(&files)
        .ok_or_else(|| anyhow::anyhow!("main.tex not found (expected path or name main.tex)"))?;

    let mut sources = Vec::with_capacity(files.len());
    for f in &files {
        sources.push(
            resolved_tex_source(&state, f.id, f.content.clone())
                .await,
        );
    }

    let tar_bytes = build_workspace_tar(&files, &sources)?;
    if tar_bytes.is_empty() {
        anyhow::bail!("no file contents to compile");
    }

    let latex_image =
        std::env::var("GLYPH_LATEX_IMAGE").unwrap_or_else(|_| "texlive/texlive:latest".into());

    let cmd: Vec<String> = vec![
        "latexmk".into(),
        "-pdf".into(),
        "-interaction=nonstopmode".into(),
        "-halt-on-error".into(),
        main_rel.clone(),
    ];

    let container_config = Config::<String> {
        image: Some(latex_image),
        cmd: Some(cmd),
        working_dir: Some("/workspace".into()),
        ..Default::default()
    };

    let options = Some(CreateContainerOptions {
        name: format!("compile-{}", job_id),
        platform: None,
    });

    let container = docker.create_container(options, container_config).await?;

    docker
        .upload_to_container(
            &container.id,
            Some(UploadToContainerOptions {
                path: "/workspace",
                ..Default::default()
            }),
            Bytes::from(tar_bytes),
        )
        .await?;

    docker.start_container::<String>(&container.id, None).await?;

    let mut logs = String::new();
    let mut log_stream = docker.logs(
        &container.id,
        Some(LogsOptions::<String> {
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

    let wait = docker
        .wait_container(
            &container.id,
            Some(WaitContainerOptions {
                condition: "not-running",
            }),
        )
        .next()
        .await;
    let status = if let Some(Ok(w)) = wait {
        if w.status_code == 0 {
            "success"
        } else {
            "failed"
        }
    } else {
        "failed"
    };

    let mut pdf_url: Option<String> = None;
    if status == "success" {
        let rel_pdf = pdf_path_for_main_tex(&main_rel);
        let container_pdf_path = format!("/workspace/{}", rel_pdf);
        let mut stream = docker.download_from_container(
            &container.id,
            Some(DownloadFromContainerOptions {
                path: container_pdf_path,
            }),
        );
        let mut tar_bytes_dl = Vec::new();
        while let Some(chunk) = stream.next().await {
            tar_bytes_dl.extend_from_slice(&chunk?);
        }

        match extract_first_file_from_tar(&tar_bytes_dl) {
            Ok(pdf_data) => {
                let dir = artifact_dir();
                std::fs::create_dir_all(&dir)?;
                let path = artifact_pdf_path(job_id);
                std::fs::write(&path, &pdf_data)?;
                pdf_url = Some(pdf_api_path(project_id, job_id));
            }
            Err(e) => {
                tracing::error!("Could not read PDF from container: {}", e);
                logs.push_str(&format!("\n[glyph] PDF artifact error: {}\n", e));
            }
        }
    }

    sqlx::query!(
        "UPDATE compilation_jobs SET status = $1, logs = $2, pdf_url = $3, completed_at = CURRENT_TIMESTAMP WHERE id = $4",
        status,
        logs,
        pdf_url,
        job_id
    )
    .execute(&state.db)
    .await?;

    docker.remove_container(&container.id, None).await?;

    Ok(())
}

fn extract_first_file_from_tar(tar_bytes: &[u8]) -> anyhow::Result<Vec<u8>> {
    let mut archive = tar::Archive::new(std::io::Cursor::new(tar_bytes));
    let mut entry = archive
        .entries()?
        .next()
        .ok_or_else(|| anyhow::anyhow!("empty archive from Docker"))??;
    let mut buf = Vec::new();
    entry.read_to_end(&mut buf)?;
    Ok(buf)
}

#[derive(Serialize, sqlx::FromRow)]
struct JobStatusRow {
    status: String,
    logs: Option<String>,
    pdf_url: Option<String>,
    started_at: chrono::DateTime<chrono::Utc>,
    completed_at: Option<chrono::DateTime<chrono::Utc>>,
}

pub async fn get_job_status(
    claims: AuthClaims,
    Path((project_id, job_id)): Path<(Uuid, Uuid)>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let has_permission = check_project_permission(&state, project_id, claims.sub).await;
    if !has_permission {
        return (StatusCode::FORBIDDEN, "Forbidden").into_response();
    }
    let job = sqlx::query_as::<_, JobStatusRow>(
        "SELECT status, logs, pdf_url, started_at, completed_at FROM compilation_jobs WHERE id = $1 AND project_id = $2",
    )
    .bind(job_id)
    .bind(project_id)
    .fetch_optional(&state.db)
    .await;

    match job {
        Ok(Some(j)) => Json(j).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "Job not found").into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Database error: {}", e),
        )
            .into_response(),
    }
}

pub async fn get_job_pdf(
    claims: AuthClaims,
    Path((project_id, job_id)): Path<(Uuid, Uuid)>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    if !check_project_permission(&state, project_id, claims.sub).await {
        return (StatusCode::FORBIDDEN, "Forbidden").into_response();
    }

    let row = sqlx::query!(
        "SELECT status FROM compilation_jobs WHERE id = $1 AND project_id = $2",
        job_id,
        project_id
    )
    .fetch_optional(&state.db)
    .await;

    let row = match row {
        Ok(Some(r)) => r,
        Ok(None) => return (StatusCode::NOT_FOUND, "Job not found").into_response(),
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Database error: {}", e),
            )
                .into_response();
        }
    };

    if row.status != "success" {
        return (
            StatusCode::BAD_REQUEST,
            "PDF not available for this job yet",
        )
            .into_response();
    }

    let path = artifact_pdf_path(job_id);
    match std::fs::read(&path) {
        Ok(bytes) => axum::response::Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, "application/pdf")
            .header(header::CACHE_CONTROL, "private, max-age=60")
            .body(Body::from(bytes))
            .unwrap()
            .into_response(),
        Err(_) => (StatusCode::NOT_FOUND, "PDF file missing on server").into_response(),
    }
}
