from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from typing import List
import uvicorn
import signal
import sys
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None

class TextInput(BaseModel):
    text: str

class TextListInput(BaseModel):
    texts: List[str]

class EmbeddingResponse(BaseModel):
    embedding: List[float]

class EmbeddingsResponse(BaseModel):
    embeddings: List[List[float]]

def load_model():
    global model
    model_path = os.environ.get('SENTENCE_TRANSFORMERS_HOME', './models')
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', cache_folder=model_path)
    print(f"Model loaded from {model_path}", flush=True)

@app.on_event("startup")
async def startup_event():
    load_model()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": model is not None}

@app.post("/embed", response_model=EmbeddingResponse)
async def embed_text(input_data: TextInput):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        embedding = model.encode(input_data.text)
        return {"embedding": embedding.tolist()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed_batch", response_model=EmbeddingsResponse)
async def embed_texts(input_data: TextListInput):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        embeddings = model.encode(input_data.texts)
        return {"embeddings": [emb.tolist() for emb in embeddings]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def signal_handler(sig, frame):
    print("Shutting down gracefully...", flush=True)
    sys.exit(0)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8765))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
