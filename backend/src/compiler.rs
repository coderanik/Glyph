use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use bollard::container::{
    Config, CreateContainerOptions, LogOutput, LogsOptions, UploadToContainerOptions,
    WaitContainerOptions,
};
use bollard::Docker;
use bytes::Bytes;
use futures_util::stream::StreamExt;
use crate::models::Claims as AuthClaims;
use crate::state::AppState;
use uuid::Uuid;
use crate::projects::check_project_permission;
use sqlx::FromRow;

pub async fn compile_project(
    claims: AuthClaims,
    Path(project_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let has_permission = check_project_permission(&state, project_id, claims.sub).await;
    if !has_permission {
        return (StatusCode::FORBIDDEN, "Forbidden").into_response();
    }

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

#[derive(Debug, FromRow)]
struct FileForCompile {
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
    files.iter().find(|f| {
        let rel = rel_path_in_workspace(f);
        rel == "main.tex" || rel.ends_with("/main.tex") || f.name == "main.tex"
    }).map(rel_path_in_workspace)
}

fn build_workspace_tar(files: &[FileForCompile]) -> anyhow::Result<Vec<u8>> {
    let mut buf = Vec::new();
    {
        let mut ar = tar::Builder::new(&mut buf);
        for f in files {
            let rel = rel_path_in_workspace(f);
            if rel.is_empty() {
                continue;
            }
            let data = f.content.as_deref().unwrap_or(&[]);
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

async fn run_compilation(state: AppState, project_id: Uuid, job_id: Uuid) -> anyhow::Result<()> {
    // Update status to running
    sqlx::query!(
        "UPDATE compilation_jobs SET status = 'running', started_at = CURRENT_TIMESTAMP WHERE id = $1",
        job_id
    )
    .execute(&state.db)
    .await?;

    let docker = Docker::connect_with_local_defaults()?;

    let files = sqlx::query_as::<_, FileForCompile>(
        "SELECT name, path, content FROM files WHERE project_id = $1",
    )
    .bind(project_id)
    .fetch_all(&state.db)
    .await?;

    let main_rel = main_tex_relative(&files)
        .ok_or_else(|| anyhow::anyhow!("main.tex not found (expected path or name main.tex)"))?;

    let tar_bytes = build_workspace_tar(&files)?;
    if tar_bytes.is_empty() {
        anyhow::bail!("no file contents to compile");
    }

    // Full TeX Live (all CTAN packages) — see https://hub.docker.com/r/texlive/texlive
    // Override with GLYPH_LATEX_IMAGE e.g. glyph-latex:latest after `docker build -t glyph-latex:latest docker/`
    let latex_image = std::env::var("GLYPH_LATEX_IMAGE")
        .unwrap_or_else(|_| "texlive/texlive:latest".into());

    // latexmk handles bib/biber, cross-refs, and multi-pass runs; matches docker/worker.sh
    let cmd: Vec<String> = vec![
        "latexmk".into(),
        "-pdf".into(),
        "-interaction=nonstopmode".into(),
        "-halt-on-error".into(),
        main_rel,
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
    claims: AuthClaims,
    Path((project_id, job_id)): Path<(Uuid, Uuid)>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let has_permission = check_project_permission(&state, project_id, claims.sub).await;
    if !has_permission {
        return (StatusCode::FORBIDDEN, "Forbidden").into_response();
    }
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
