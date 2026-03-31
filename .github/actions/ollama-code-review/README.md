# Ollama Code Review Action

This GitHub Action uses Ollama to automatically review code changes in pull requests.

## Features

- 🤖 Automated code review using Ollama LLM models
- 📝 Posts review comments directly to PRs
- 🔧 Configurable LLM model selection
- 🚀 Lightweight and self-hosted (no external API costs)
- ⚡ Support for multiple Ollama models (CodeGemma, Llama2, Mistral, etc.)

## Setup

### Prerequisites

1. **Ollama installed and running** on your self-hosted runner or accessible via network
2. **GitHub Actions** enabled on your repository

### Installation

1. The workflow is already configured in `.github/workflows/ollama_review.yml`
2. Ensure Ollama is running before PRs are created:
   ```bash
   ollama serve
   ```

3. Pre-pull the model you want to use:
   ```bash
   ollama pull codegemma
   # or
   ollama pull llama2
   # or
   ollama pull mistral
   ```

## Usage

### Basic Workflow (Already Configured)

```yaml
name: Automated Ollama Code Review

on:
  pull_request:
    branches:
      - main

jobs:
  ollama_review:
    runs-on: ubuntu-latest
    name: Ollama Code Review Job
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v2

      - name: Ollama Code Review
        uses: ./.github/actions/ollama-code-review
        with:
          llm-model: 'codegemma'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Inputs

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `llm-model` | LLM model name (codegemma, llama2, mistral, etc.) | `codegemma` | No |
| `ollama-url` | Ollama API endpoint | `http://localhost:11434` | No |
| `review-format` | Output format (compact or detailed) | `compact` | No |

### Outputs

| Output | Description |
|--------|-------------|
| `review-status` | Status of review: `success`, `partial`, `failed`, or `no_changes` |
| `review-summary` | The actual code review feedback |

## Configuration Examples

### Using Different Models

```yaml
- name: Ollama Code Review with Llama2
  uses: ./.github/actions/ollama-code-review
  with:
    llm-model: 'llama2'
```

### Custom Ollama Endpoint

```yaml
- name: Ollama Code Review
  uses: ./.github/actions/ollama-code-review
  with:
    llm-model: 'codegemma'
    ollama-url: 'http://ollama-server.example.com:11434'
```

## Supported Models

- **codegemma** - Google's code-focused LLM (recommended for code review)
- **llama2** - Meta's general-purpose LLM
- **mistral** - Mistral's efficient model
- **neural-chat** - Intel's neural chat model
- **codellama** - Meta's code-specific model

To use a different model, pull it first:
```bash
ollama pull mistral
```

## Self-Hosted Runner Setup

If using self-hosted runners, ensure Ollama is running:

1. Install Ollama: https://ollama.ai/download
2. Create a systemd service or startup script:
   ```bash
   [Unit]
   Description=Ollama Service
   After=network-online.target
   
   [Service]
   Type=simple
   User=youruser
   ExecStart=/usr/local/bin/ollama serve
   Restart=always
   
   [Install]
   WantedBy=multi-user.target
   ```

3. Enable the service:
   ```bash
   sudo systemctl enable ollama
   sudo systemctl start ollama
   ```

## Troubleshooting

### Ollama Not Available

If you see a message that Ollama is not available:
- Ensure Ollama is running: `ollama serve`
- Check the URL matches your Ollama instance
- For self-hosted runners, ensure network connectivity

### Model Not Found

If the model isn't found:
```bash
ollama pull codegemma  # (or your chosen model)
```

### Review Not Posted

- Check that `GITHUB_TOKEN` has permissions to comment on PRs
- Review the workflow logs for errors
- Ensure the PR has actual code changes

## Performance Considerations

- Review time depends on model size and code diff size
- CodeGemma is optimized for code review tasks
- Diffs larger than 4000 characters are truncated for performance

## Customization

To modify the review prompt or logic, edit `action.yml` in the `Run code review` step's shell script section.

## Privacy

All code review happens locally on your Ollama instance. No code is sent to external services.
