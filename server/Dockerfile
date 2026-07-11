FROM node:20-bookworm AS builder

WORKDIR /app

# Copy package configurations
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY frontend/package.json ./frontend/

# Install dependencies for building
RUN npm ci --workspace=server --include=dev

# Copy server source code
COPY server ./server

# Build the TypeScript project
RUN npm run build -w server

# Production stage — API + in-process LaTeX compile (no separate worker needed)
FROM node:20-bookworm-slim

# TeX Live scheme large enough for typical papers without shipping texlive-full (~multi-GB)
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-fonts-recommended \
    texlive-latex-extra \
    texlive-science \
    texlive-pictures \
    texlive-bibtex-extra \
    biber \
    latexmk \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package configuration and built output
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/server/dist ./server/dist

# Install production dependencies only
RUN npm ci --workspace=server --omit=dev

WORKDIR /app/server

EXPOSE 8083

CMD ["node", "dist/src/index.js"]
