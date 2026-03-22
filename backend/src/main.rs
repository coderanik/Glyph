mod state;
mod models;
mod auth;
mod projects;
mod compiler;

use axum::{
    extract::{ws::WebSocketUpgrade, Path, State},
    response::IntoResponse,
    routing::{get, post, put},
    Router,
};
use std::net::SocketAddr;
use axum::http::request::Parts;
use axum::http::HeaderValue;
use tower_http::cors::{AllowOrigin, Any, CorsLayer};
use std::sync::Arc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use crate::state::AppState;
use crate::auth::{google_auth, google_callback, github_auth, github_callback, get_me, register, login};
use crate::projects::{create_project, list_projects, create_file, get_project_files, update_file_content};
use crate::compiler::{compile_project, get_job_pdf, get_job_status};
use dotenvy::dotenv;
use yrs_axum::ws::AxumConn;
use yrs_axum::AwarenessRef;
use yrs::sync::Awareness;
use yrs::updates::decoder::Decode;
use yrs::{Doc, Text, Transact, Update};
use uuid::Uuid;
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env file
    dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "backend=debug,tower_http=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Initialize state
    let state = AppState::new().await.unwrap_or_else(|e| {
        tracing::error!("Failed to initialize full state (DB/Redis), using dummy: {}", e);
        panic!("State initialization is required: {}", e);
    });

    // Spawn persistence worker
    let worker_state = state.clone();
    tokio::spawn(async move {
        loop {
            sleep(Duration::from_secs(10)).await;
            if let Err(e) = worker_state.persist_sessions().await {
                tracing::error!("Persistence worker error: {}", e);
            }
        }
    });
    
    let app = Router::new()
        .route("/", get(|| async { "Hello, Glyph!" }))
        // Auth
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route("/auth/google", get(google_auth))
        .route("/auth/google/callback", get(google_callback))
        .route("/auth/github", get(github_auth))
        .route("/auth/github/callback", get(github_callback))
        .route("/auth/me", get(get_me))
        // Projects
        .route("/projects", post(create_project).get(list_projects))
        .route("/projects/:project_id/files", post(create_file).get(get_project_files))
        .route("/projects/:project_id/files/:file_id", put(update_file_content))
        // Compilation
        .route("/projects/:project_id/compile", post(compile_project))
        .route("/projects/:project_id/jobs/:job_id", get(get_job_status))
        .route(
            "/projects/:project_id/jobs/:job_id/pdf",
            get(get_job_pdf),
        )
        // Collaboration
        .route("/ws/:file_id", get(ws_handler))
        .with_state(state)
        // Middleware must be applied *after* `with_state` so it wraps the full service (see axum middleware docs).
        .layer(
            CorsLayer::new()
                .allow_origin(AllowOrigin::predicate(
                    |origin: &HeaderValue, _request: &Parts| {
                        let o = origin.as_bytes();
                        o.starts_with(b"http://localhost:")
                            || o.starts_with(b"http://127.0.0.1:")
                    },
                ))
                .allow_methods(Any)
                .allow_headers(Any)
                .expose_headers(Any),
        );

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(4000);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::debug!("listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    Path(file_id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let awareness: AwarenessRef = if let Some(a) = state.session_store.get(&file_id) {
        a.clone()
    } else {
        let file = sqlx::query!("SELECT content FROM files WHERE id = $1", file_id)
            .fetch_optional(&state.db)
            .await
            .unwrap();

        let doc = Doc::new();
        if let Some(f) = file {
            if let Some(content) = f.content {
                if let Ok(update) = Update::decode_v1(&content) {
                    let mut txn = doc.transact_mut();
                    txn.apply_update(update);
                } else if let Ok(s) = std::str::from_utf8(&content) {
                    // Legacy/plaintext seed (e.g. first main.tex from API) — not Yjs-encoded
                    let text = doc.get_or_insert_text("codemirror");
                    let mut txn = doc.transact_mut();
                    text.insert(&mut txn, 0, s);
                }
            }
        }

        let _text = doc.get_or_insert_text("codemirror");
        let a: AwarenessRef = Arc::new(tokio::sync::RwLock::new(Awareness::new(doc)));
        state.session_store.insert(file_id, a.clone());
        a
    };

    ws.on_upgrade(move |socket| async move {
        let conn = AxumConn::new(awareness, socket);
        if let Err(e) = conn.await {
            tracing::debug!("websocket session ended: {:?}", e);
        }
    })
}

