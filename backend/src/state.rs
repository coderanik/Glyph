use sqlx::postgres::PgPool;
use redis::Client as RedisClient;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: RedisClient,
}

impl AppState {
    pub async fn new() -> anyhow::Result<Self> {
        let database_url = std::env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set");
        let redis_url = std::env::var("REDIS_URL")
            .expect("REDIS_URL must be set");

        let db = PgPool::connect(&database_url).await?;
        let redis = RedisClient::open(redis_url)?;

        Ok(Self { db, redis })
    }
}
