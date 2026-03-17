use sqlx::postgres::PgPool;
use redis::Client as RedisClient;
use std::sync::Arc;
use dashmap::DashMap;
use tokio::sync::broadcast;
use yrs::Doc;
use y_sync::awareness::Awareness;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: RedisClient,
    pub session_store: DashMap<String, Arc<Awareness>>,
    pub channels: DashMap<String, broadcast::Sender<Vec<u8>>>,
}

impl AppState {
    pub async fn new() -> anyhow::Result<Self> {
        let database_url = std::env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set");
        let redis_url = std::env::var("REDIS_URL")
            .expect("REDIS_URL must be set");

        let db = PgPool::connect(&database_url).await?;
        let redis = RedisClient::open(redis_url)?;
        let session_store = DashMap::new();
        let channels = DashMap::new();

        Ok(Self { db, redis, session_store, channels })
    }

    pub fn get_broadcast_channel(&self, project_id: &str) -> broadcast::Sender<Vec<u8>> {
        self.channels.entry(project_id.to_string()).or_insert_with(|| {
            let (tx, _) = broadcast::channel(1024);
            tx
        }).value().clone()
    }
}
