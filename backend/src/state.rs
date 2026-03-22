use sqlx::postgres::PgPool;
use redis::Client as RedisClient;
use dashmap::DashMap;
use tokio::sync::broadcast;
use oauth2::basic::BasicClient;
use oauth2::{AuthUrl, ClientId, ClientSecret, RedirectUrl, TokenUrl};
use uuid::Uuid;
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
        let database_url = std::env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set");
        let redis_url = std::env::var("REDIS_URL")
            .expect("REDIS_URL must be set");

        let db = PgPool::connect(&database_url).await?;
        let redis = RedisClient::open(redis_url)?;
        let session_store = DashMap::new();
        let channels = DashMap::new();

        // Google OAuth Client
        let google_client_id = ClientId::new(std::env::var("GOOGLE_CLIENT_ID").expect("GOOGLE_CLIENT_ID must be set"));
        let google_client_secret = ClientSecret::new(std::env::var("GOOGLE_CLIENT_SECRET").expect("GOOGLE_CLIENT_SECRET must be set"));
        let google_auth_url = AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".to_string())
            .expect("Invalid authorization endpoint URL");
        let google_token_url = TokenUrl::new("https://www.googleapis.com/oauth2/v4/token".to_string())
            .expect("Invalid token endpoint URL");
        let google_redirect_url = RedirectUrl::new(std::env::var("GOOGLE_REDIRECT_URL").expect("GOOGLE_REDIRECT_URL must be set"))
            .expect("Invalid redirect URL");

        let google_client = BasicClient::new(
            google_client_id,
            Some(google_client_secret),
            google_auth_url,
            Some(google_token_url),
        )
        .set_redirect_uri(google_redirect_url);

        // GitHub OAuth Client
        let github_client_id = ClientId::new(std::env::var("GITHUB_CLIENT_ID").expect("GITHUB_CLIENT_ID must be set"));
        let github_client_secret = ClientSecret::new(std::env::var("GITHUB_CLIENT_SECRET").expect("GITHUB_CLIENT_SECRET must be set"));
        let github_auth_url = AuthUrl::new("https://github.com/login/oauth/authorize".to_string())
            .expect("Invalid authorization endpoint URL");
        let github_token_url = TokenUrl::new("https://github.com/login/oauth/access_token".to_string())
            .expect("Invalid token endpoint URL");
        let github_redirect_url = RedirectUrl::new(std::env::var("GITHUB_REDIRECT_URL").expect("GITHUB_REDIRECT_URL must be set"))
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

    pub fn get_broadcast_channel(&self, project_id: &str) -> broadcast::Sender<Vec<u8>> {
        self.channels.entry(project_id.to_string()).or_insert_with(|| {
            let (tx, _) = broadcast::channel(1024);
            tx
        }).value().clone()
    }
}
