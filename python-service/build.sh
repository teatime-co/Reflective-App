#!/bin/bash

set -e

echo "Creating virtual environment..."
python3 -m venv .venv
source .venv/bin/activate

echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller

echo "Pre-downloading model..."
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', cache_folder='./models')"

echo "Building executable with PyInstaller..."
pyinstaller embedding_server.spec --clean

echo "Build complete! Executable at: dist/embedding_server"
ls -lh dist/
