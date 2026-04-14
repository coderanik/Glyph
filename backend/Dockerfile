FROM rust:bookworm AS builder

WORKDIR /usr/src/app

# We use the full rust:bookworm image which already has pkg-config, gcc, and libssl-dev installed!
# This avoids any apt-get hash mismatch errors on Debian mirrors and supports Edition 2024 packages.

COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations

# Attempt building the release binary
RUN cargo build --release

# Final minimal runner image
FROM debian:bookworm-slim
# Add --fix-missing to bypass any temporary debian repository mirror hash issues
RUN apt-get update && apt-get install -y --fix-missing ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy compiled binary and migrations over
COPY --from=builder /usr/src/app/target/release/backend /app/backend
COPY --from=builder /usr/src/app/migrations /app/migrations

ENV PORT=4000
EXPOSE 4000

CMD ["./backend"]
