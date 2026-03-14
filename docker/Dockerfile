FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install TeX Live full and other necessary packages
RUN apt-get update && apt-get install -y \
    texlive-full \
    biber \
    latexmk \
    python3 \
    curl \
    git \
    make \
    && rm -rf /var/lib/apt/lists/*

# Set up working directory for the compilation job
WORKDIR /workspace

# Container expects to process a provided folder or job.
# In production, a runner script or rust worker would pull from S3, compile, and upload back.
COPY worker.sh /usr/local/bin/worker.sh
RUN chmod +x /usr/local/bin/worker.sh

ENTRYPOINT ["/usr/local/bin/worker.sh"]
