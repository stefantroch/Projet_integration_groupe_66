import io
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from PIL import UnidentifiedImageError

from src.inference.predict import AnimalPredictor


LOGGER = logging.getLogger("animal-recognition")
MODEL_PATH = Path(os.getenv("MODEL_PATH", "/models/best_model.pth"))
MAX_IMAGE_BYTES = 10 * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.predictor = None
    try:
        app.state.predictor = AnimalPredictor(MODEL_PATH)
        LOGGER.info("Recognition model loaded from %s", MODEL_PATH)
    except FileNotFoundError:
        LOGGER.warning(
            "Recognition model not found at %s; /predict will be unavailable until it is mounted",
            MODEL_PATH,
        )
    yield


app = FastAPI(title="Animal Recognition API", lifespan=lifespan)


@app.get("/health")
def health():
    ready = app.state.predictor is not None
    payload = {
        "status": "ready" if ready else "model_missing",
        "model_loaded": ready,
    }
    return JSONResponse(payload, status_code=200 if ready else 503)


@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    predictor = app.state.predictor
    if predictor is None:
        raise HTTPException(
            status_code=503,
            detail=f"Model checkpoint not found at {MODEL_PATH}",
        )

    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Upload an image file")

    contents = await image.read(MAX_IMAGE_BYTES + 1)
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds 10 MiB")
    if not contents:
        raise HTTPException(status_code=400, detail="Image is empty")

    try:
        result = await run_in_threadpool(
            predictor.predict,
            io.BytesIO(contents),
        )
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="Invalid image file") from None

    return result
