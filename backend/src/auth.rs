use std::future::Future;

use axum::{
    extract::{FromRequestParts, Query, State},
    http::{request::Parts, StatusCode},
    response::{IntoResponse, Redirect},
    Json,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use oauth2::{
    basic::BasicClient, reqwest::async_http_client, AuthorizationCode, CsrfToken, Scope,
    TokenResponse,
};
use serde::{Deserialize, Serialize};
use std::env;
use crate::models::{Claims, User};
use crate::state::AppState;
use uuid::Uuid;
use chrono::{Utc, Duration};
use bcrypt::{hash, verify, DEFAULT_COST};

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub name: String,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> impl IntoResponse {
    let hashed_password = match hash(&payload.password, DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to hash password").into_response(),
    };

    let user = sqlx::query_as::<_, User>(
        "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *"
    )
    .bind(&payload.email)
    .bind(&payload.name)
    .bind(&hashed_password)
    .fetch_one(&state.db)
    .await;

    match user {
        Ok(user) => {
            let token = match generate_jwt(user.id) {
                Ok(token) => token,
                Err(e) => {
                    tracing::error!("JWT generation error during register: {}", e);
                    return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to issue token").into_response();
                }
            };
            let response = serde_json::json!({
                "token": token,
                "user": user,
            });
            (StatusCode::CREATED, Json(response)).into_response()
        }
        Err(sqlx::Error::Database(db_err)) if db_err.code().as_deref() == Some("23505") => {
            (StatusCode::CONFLICT, "User already exists").into_response()
        }
        Err(e) => {
            tracing::error!("Register DB error: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response()
        }
    }
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, email, name, password_hash, oauth_provider, oauth_id, created_at, updated_at FROM users WHERE email = $1"
    )
    .bind(&payload.email)
    .fetch_optional(&state.db)
    .await;

    match user {
        Ok(Some(user)) => {
            if let Some(password_hash) = &user.password_hash {
                if verify(&payload.password, password_hash).unwrap_or(false) {
                    let token = generate_jwt(user.id).unwrap();
                    let response = serde_json::json!({
                        "token": token,
                        "user": user,
                    });
                    return Json(response).into_response();
                }
            }
            (StatusCode::UNAUTHORIZED, "Invalid credentials").into_response()
        }
        Ok(None) => (StatusCode::UNAUTHORIZED, "Invalid credentials").into_response(),
        Err(e) => {
            tracing::error!("Login DB error: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response()
        }
    }
}


pub async fn google_auth(State(state): State<AppState>) -> impl IntoResponse {
    let (auth_url, _csrf_token) = state
        .google_client
        .authorize_url(CsrfToken::new_random)
        .add_scope(Scope::new("https://www.googleapis.com/auth/userinfo.email".to_string()))
        .add_scope(Scope::new("https://www.googleapis.com/auth/userinfo.profile".to_string()))
        .url();

    Redirect::to(auth_url.as_str())
}

#[derive(Deserialize)]
pub struct AuthCallback {
    pub code: String,
    pub state: String,
}

pub async fn google_callback(
    State(state): State<AppState>,
    Query(query): Query<AuthCallback>,
) -> impl IntoResponse {
    let token_result = state
        .google_client
        .exchange_code(AuthorizationCode::new(query.code))
        .request_async(async_http_client)
        .await;

    let token = match token_result {
        Ok(t) => t,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to exchange token").into_response(),
    };

    let client = reqwest::Client::new();
    let user_info_res = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(token.access_token().secret())
        .send()
        .await;

    let user_info: GoogleUser = match user_info_res {
        Ok(res) => res.json().await.unwrap(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to get user info").into_response(),
    };

    let user = upsert_user(&state, &user_info.email, &user_info.name, "google", &user_info.id).await;
    
    match user {
        Ok(user) => {
            let token = generate_jwt(user.id).unwrap();
            let frontend_url = env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());
            Redirect::to(&format!("{}/auth/callback?token={}", frontend_url, token)).into_response()
        }
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Failed to sync user").into_response(),
    }
}

pub async fn github_auth(State(state): State<AppState>) -> impl IntoResponse {
    let (auth_url, _csrf_token) = state
        .github_client
        .authorize_url(CsrfToken::new_random)
        .add_scope(Scope::new("user:email".to_string()))
        .add_scope(Scope::new("read:user".to_string()))
        .url();

    Redirect::to(auth_url.as_str())
}

pub async fn github_callback(
    State(state): State<AppState>,
    Query(query): Query<AuthCallback>,
) -> impl IntoResponse {
    let token_result = state
        .github_client
        .exchange_code(AuthorizationCode::new(query.code))
        .request_async(async_http_client)
        .await;

    let token = match token_result {
        Ok(t) => t,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to exchange token").into_response(),
    };

    let client = reqwest::Client::new();
    let user_info_res = client
        .get("https://api.github.com/user")
        .header("User-Agent", "Glyph-Backend")
        .bearer_auth(token.access_token().secret())
        .send()
        .await;

    let github_user: GitHubUser = match user_info_res {
        Ok(res) => res.json().await.unwrap(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to get user info").into_response(),
    };

    // GitHub emails might be private, fetch separately if needed, but for now assume we have it or use dummy
    let email = github_user.email.unwrap_or_else(|| format!("{}@github.com", github_user.id));

    let user = upsert_user(&state, &email, &github_user.name.unwrap_or(github_user.login), "github", &github_user.id.to_string()).await;
    
    match user {
        Ok(user) => {
            let token = generate_jwt(user.id).unwrap();
            let frontend_url = env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());
            Redirect::to(&format!("{}/auth/callback?token={}", frontend_url, token)).into_response()
        }
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Failed to sync user").into_response(),
    }
}

async fn upsert_user(state: &AppState, email: &str, name: &str, provider: &str, provider_id: &str) -> anyhow::Result<User> {
    let user = sqlx::query_as::<_, User>(
        "INSERT INTO users (email, name, oauth_provider, oauth_id) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (email) DO UPDATE 
         SET name = EXCLUDED.name, oauth_provider = EXCLUDED.oauth_provider, oauth_id = EXCLUDED.oauth_id, updated_at = CURRENT_TIMESTAMP
         RETURNING *"
    )
    .bind(email)
    .bind(name)
    .bind(provider)
    .bind(provider_id)
    .fetch_one(&state.db)
    .await?;

    Ok(user)
}

#[derive(Deserialize)]
struct GoogleUser {
    id: String,
    email: String,
    name: String,
}

#[derive(Deserialize)]
struct GitHubUser {
    id: u64,
    login: String,
    name: Option<String>,
    email: Option<String>,
}

pub fn generate_jwt(user_id: Uuid) -> anyhow::Result<String> {
    let expiration = Utc::now()
        .checked_add_signed(Duration::days(7))
        .expect("valid timestamp")
        .timestamp();

    let claims = Claims {
        sub: user_id,
        exp: expiration as usize,
        iat: Utc::now().timestamp() as usize,
    };

    let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "glyph-dev-jwt-secret".to_string());
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_ref()),
    )?;

    Ok(token)
}

impl<S> FromRequestParts<S> for Claims
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, Json<serde_json::Value>);

    fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> impl Future<Output = Result<Self, Self::Rejection>> + Send {
        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|h| h.to_str().ok())
            .map(|s| s.to_string());

        async move {
            let auth_header = auth_header.ok_or((
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({"error": "Missing authorization header"})),
            ))?;

            if !auth_header.starts_with("Bearer ") {
                return Err((
                    StatusCode::UNAUTHORIZED,
                    Json(serde_json::json!({"error": "Invalid authorization header"})),
                ));
            }

            let token = &auth_header[7..];
            let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "glyph-dev-jwt-secret".to_string());

            let token_data = decode::<Claims>(
                token,
                &DecodingKey::from_secret(secret.as_ref()),
                &Validation::default(),
            )
            .map_err(|_| {
                (
                    StatusCode::UNAUTHORIZED,
                    Json(serde_json::json!({"error": "Invalid token"})),
                )
            })?;

            Ok(token_data.claims)
        }
    }
}

pub async fn get_me(claims: Claims, State(state): State<AppState>) -> impl IntoResponse {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(claims.sub)
        .fetch_optional(&state.db)
        .await
        .unwrap();

    match user {
        Some(user) => Json(user).into_response(),
        None => (StatusCode::NOT_FOUND, "User not found").into_response(),
    }
}
