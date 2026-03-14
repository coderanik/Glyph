mod state;
mod models;

use axum::{
    routing::get,
    Router,
};
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use crate::state::AppState;
use dotenvy::dotenv;

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
    // Note: This will fail if DB/Redis are not running, but good for structure.
    // In a real dev flow, we might want to handle this more gracefully or 
    // just let it panic to indicate infrastructure is missing.
    // let state = AppState::new().await?; 
    
    // For now, I'll comment out the actual connection to allow the code to compile/run 
    // even without Docker strictly running yet.
    
    let app = Router::new()
        .route("/", get(|| async { "Hello, TeXable!" }));
        // .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    tracing::debug!("listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
