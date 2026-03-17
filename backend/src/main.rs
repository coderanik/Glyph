mod state;
mod models;

use axum::{
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, Path, State},
    response::IntoResponse,
    routing::get,
    Router,
};
use std::net::SocketAddr;
use std::sync::Arc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use crate::state::AppState;
use dotenvy::dotenv;
use yrs_axum::WssAwareness;

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
    
    let app = Router::new()
        .route("/", get(|| async { "Hello, Glyph!" }))
        .route("/ws/:project_id", get(ws_handler))
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    tracing::debug!("listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    Path(project_id): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let awareness = state.session_store.entry(project_id.clone()).or_insert_with(|| {
        let doc = Doc::new();
        let _text = doc.get_or_insert_text("codemirror");
        Arc::new(Awareness::new(doc))
    }).value().clone();

    ws.on_upgrade(move |socket| WssAwareness::new(awareness).handle(socket))
}
