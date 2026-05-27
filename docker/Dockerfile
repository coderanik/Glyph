FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install TeX Live and compilation toolchain
# texlive-full is large (~5GB) but ensures all packages are available.
# For a slimmer image, replace with texlive-latex-extra, texlive-fonts-recommended, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-full \
    biber \
    latexmk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY worker.sh /usr/local/bin/worker.sh
RUN chmod +x /usr/local/bin/worker.sh

# The Hono backend mounts a temp directory into /workspace and runs:
#   docker run --rm -v <host_path>:/workspace glyph-compiler /usr/local/bin/worker.sh main.tex
# No ENTRYPOINT — the server orchestrates one-shot compilation via the Docker API.
