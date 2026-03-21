mod state;
mod models;
mod auth;
mod projects;
mod compiler;

use axum::{
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, Path, State},
    response::IntoResponse,
    routing::{get, post, put},
    Router,
};
use std::net::SocketAddr;
use std::sync::Arc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use crate::state::AppState;
use crate::auth::{google_auth, google_callback, github_auth, github_callback, get_me};
use crate::projects::{create_project, list_projects, create_file, get_project_files, update_file_content};
use crate::compiler::{compile_project, get_job_status};
use dotenvy::dotenv;
use yrs_axum::WssAwareness;
use yrs::{Doc, Transact, Update};
use y_sync::awareness::Awareness;
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
            if let Err(e) = persist_sessions(&worker_state).await {
                tracing::error!("Persistence worker error: {}", e);
            }
        }
    });
    
    let app = Router::new()
        .route("/", get(|| async { "Hello, Glyph!" }))
        // Auth
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
        // Collaboration
        .route("/ws/:file_id", get(ws_handler))
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
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
    let awareness = if let Some(a) = state.session_store.get(&file_id) {
        a.clone()
    } else {
        // Try to load from DB
        let file = sqlx::query!("SELECT content FROM files WHERE id = $1", file_id)
            .fetch_optional(&state.db)
            .await
            .unwrap();

        let doc = Doc::new();
        if let Some(f) = file {
            if let Some(content) = f.content {
                // Apply update to doc
                if let Ok(update) = Update::decode_v1(&content) {
                    let mut txn = doc.transact_mut();
                    txn.apply_update(update).unwrap();
                }
            }
        }
        
        // Ensure "codemirror" text type exists
        let _text = doc.get_or_insert_text("codemirror");
        let a = Arc::new(Awareness::new(doc));
        state.session_store.insert(file_id, a.clone());
        a
    };

    ws.on_upgrade(move |socket| WssAwareness::new(awareness).handle(socket))
}

async fn persist_sessions(state: &AppState) -> anyhow::Result<()> {
    for entry in state.session_store.iter() {
        let file_id = *entry.key();
        let awareness = entry.value();
        let doc = awareness.doc();
        
        let update = doc.transact().encode_state_as_update_v1(&yrs::StateVector::default());
        
        sqlx::query!(
            "UPDATE files SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            update,
            file_id
        )
        .execute(&state.db)
        .await?;
    }
    Ok(())
}
