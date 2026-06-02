#!/bin/bash
set -e

# basic compilation script
echo "Starting Glyph Compilation Worker..."

# Arguments to potentially get S3 path or compile local
FILE_NAME=${1:-main.tex}

if [ ! -f "$FILE_NAME" ]; then
    echo "Error: $FILE_NAME not found."
    exit 1
fi

echo "Compiling $FILE_NAME with latexmk..."
# -pdf invokes pdflatex, -interaction=nonstopmode prevents stopping on errors
latexmk -pdf -interaction=nonstopmode "$FILE_NAME"

echo "Compilation finished successfully."
