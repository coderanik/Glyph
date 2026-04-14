use sqlx::postgres::PgPool;
use redis::Client as RedisClient;
use dashmap::DashMap;
use tokio::sync::broadcast;
use oauth2::basic::BasicClient;
use oauth2::{AuthUrl, ClientId, ClientSecret, RedirectUrl, TokenUrl};
use uuid::Uuid;
use yrs::{ReadTxn, Transact};
use yrs_axum::AwarenessRef;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: RedisClient,
    pub session_store: DashMap<Uuid, AwarenessRef>,
    pub channels: DashMap<String, broadcast::Sender<Vec<u8>>>,
    pub google_client: BasicClient,
    pub github_client: BasicClient,
}

impl AppState {
    pub async fn new() -> anyhow::Result<Self> {
        // Defaults match `docker-compose.yml` when Postgres/Redis are exposed on the host.
        let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://glyph:glyph_password@127.0.0.1:5433/glyph".to_string()
        });
        let redis_url = std::env::var("REDIS_URL")
            .unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());

        let db = PgPool::connect(&database_url).await?;
        let redis = RedisClient::open(redis_url)?;
        let session_store = DashMap::new();
        let channels = DashMap::new();

        // Google OAuth Client
        let google_client_id = ClientId::new(std::env::var("GOOGLE_CLIENT_ID").unwrap_or_else(
            |_| "local-google-client-id".to_string(),
        ));
        let google_client_secret = ClientSecret::new(std::env::var("GOOGLE_CLIENT_SECRET").unwrap_or_else(
            |_| "local-google-client-secret".to_string(),
        ));
        let google_auth_url = AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".to_string())
            .expect("Invalid authorization endpoint URL");
        let google_token_url = TokenUrl::new("https://www.googleapis.com/oauth2/v4/token".to_string())
            .expect("Invalid token endpoint URL");
        let google_redirect_url = RedirectUrl::new(std::env::var("GOOGLE_REDIRECT_URL").unwrap_or_else(
            |_| "http://localhost:4000/auth/google/callback".to_string(),
        ))
            .expect("Invalid redirect URL");

        let google_client = BasicClient::new(
            google_client_id,
            Some(google_client_secret),
            google_auth_url,
            Some(google_token_url),
        )
        .set_redirect_uri(google_redirect_url);

        // GitHub OAuth Client
        let github_client_id = ClientId::new(std::env::var("GITHUB_CLIENT_ID").unwrap_or_else(
            |_| "local-github-client-id".to_string(),
        ));
        let github_client_secret = ClientSecret::new(std::env::var("GITHUB_CLIENT_SECRET").unwrap_or_else(
            |_| "local-github-client-secret".to_string(),
        ));
        let github_auth_url = AuthUrl::new("https://github.com/login/oauth/authorize".to_string())
            .expect("Invalid authorization endpoint URL");
        let github_token_url = TokenUrl::new("https://github.com/login/oauth/access_token".to_string())
            .expect("Invalid token endpoint URL");
        let github_redirect_url = RedirectUrl::new(std::env::var("GITHUB_REDIRECT_URL").unwrap_or_else(
            |_| "http://localhost:4000/auth/github/callback".to_string(),
        ))
            .expect("Invalid redirect URL");

        let github_client = BasicClient::new(
            github_client_id,
            Some(github_client_secret),
            github_auth_url,
            Some(github_token_url),
        )
        .set_redirect_uri(github_redirect_url);

        Ok(Self { db, redis, session_store, channels, google_client, github_client })
    }

    /// Persist in-memory Yjs sessions to the database (files.content holds Yjs updates).
    pub async fn persist_sessions(&self) -> anyhow::Result<()> {
        for entry in self.session_store.iter() {
            let file_id = *entry.key();
            let awareness = entry.value();
            let update = {
                let guard = awareness.read().await;
                let doc = guard.doc();
                let txn = doc.transact();
                txn.encode_state_as_update_v1(&yrs::StateVector::default())
            };

            sqlx::query("UPDATE files SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2")
            .bind(update)
            .bind(file_id)
            .execute(&self.db)
            .await?;
        }
        Ok(())
    }

    pub fn get_broadcast_channel(&self, project_id: &str) -> broadcast::Sender<Vec<u8>> {
        self.channels.entry(project_id.to_string()).or_insert_with(|| {
            let (tx, _) = broadcast::channel(1024);
            tx
        }).value().clone()
    }
}
