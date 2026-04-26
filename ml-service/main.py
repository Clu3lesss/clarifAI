import os
import io
import time
import base64
import traceback
import warnings
warnings.filterwarnings('ignore', category=FutureWarning)

import torch
import torch.nn as nn
import numpy as np
from PIL import Image
from torchvision.models import efficientnet_b4
import torchvision.transforms as T
from torch.amp import autocast
from facenet_pytorch import MTCNN
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request
from dotenv import load_dotenv

load_dotenv()

# ── Config ─────────────────────────────────────────────────────────────────────
DEVICE     = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
MODEL_PATH = 'models/clarifai_inference.pth'
MAX_SIZE   = 10 * 1024 * 1024  # 10 MB
API_KEY    = os.environ.get('ML_API_KEY', '')

print(f"Starting ClarifAI service on: {DEVICE}")

# ── Load models at startup ─────────────────────────────────────────────────────
mtcnn = MTCNN(
    image_size=224,
    margin=20,
    keep_all=False,
    post_process=False,   # returns raw 0-255 uint8 tensor, not normalised float
    device=DEVICE,
)

checkpoint   = torch.load(MODEL_PATH, map_location=DEVICE, weights_only=False)
CLASS_TO_IDX = checkpoint['class_to_idx']
FAKE_IDX     = CLASS_TO_IDX['fake']

model = efficientnet_b4(weights=None)
model.classifier[1] = nn.Linear(1792, 2)
model.load_state_dict(checkpoint['model_state_dict'])
model = model.to(DEVICE)
model.eval()

# GradCAM targets the last convolutional block of EfficientNet-B4
cam = GradCAM(model=model, target_layers=[model.features[-1]])

print(f"[OK] Models loaded — fake_idx={FAKE_IDX}, AUC={checkpoint['auc']:.4f}")

# ── Transforms ─────────────────────────────────────────────────────────────────
_normalize = T.Compose([
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406],
                std =[0.229, 0.224, 0.225]),
])

_fallback_transform = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406],
                std =[0.229, 0.224, 0.225]),
])

# ── FastAPI setup ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)
app     = FastAPI(title="ClarifAI", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "http://localhost:5000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API-key guard ──────────────────────────────────────────────────────────────
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_api_key(api_key: str = Security(api_key_header)):
    """Skip check when no key is configured (dev mode)."""
    if not API_KEY:
        return
    if api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")

# ── Core inference ─────────────────────────────────────────────────────────────
def run_inference(img: Image.Image) -> dict:
    """
    Run MTCNN face crop → EfficientNet-B4 classification → GradCAM heatmap.

    Returns
    -------
    dict with keys: score, risk, p_fake, face_detected, heatmap_b64
    """
    # ── 1. Face detection / crop ───────────────────────────────────────────────
    face_detected = True
    face_tensor   = mtcnn(img)          # uint8 CHW tensor or None

    if face_tensor is not None:
        # MTCNN returns a float tensor in [0, 255] when post_process=False
        face_np     = face_tensor.permute(1, 2, 0).cpu().numpy().clip(0, 255).astype(np.uint8)
        face_pil    = Image.fromarray(face_np)
        input_tensor = _normalize(face_pil).unsqueeze(0).to(DEVICE)
        display_img  = face_np                          # uint8 HWC for GradCAM overlay
    else:
        face_detected = False
        resized       = img.resize((224, 224))
        input_tensor  = _fallback_transform(resized).unsqueeze(0).to(DEVICE)
        display_img   = np.array(resized)               # uint8 HWC

    # ── 2. Prediction (no-grad, optionally mixed-precision) ────────────────────
    with torch.no_grad():
        if DEVICE.type == 'cuda':
            with autocast('cuda'):
                logits = model(input_tensor)
        else:
            logits = model(input_tensor)

        probs  = torch.softmax(logits, dim=1)
        p_fake = probs[0][FAKE_IDX].item()

    score = int(p_fake * 100)

    # ── 3. GradCAM heatmap ─────────────────────────────────────────────────────
    # KEY FIX: GradCAM needs its own forward+backward pass with gradients
    # enabled.  input_tensor was produced inside torch.no_grad(), so it carries
    # no grad_fn.  We must clone+detach it and set requires_grad=True so that
    # the hooks GradCAM registers can fire properly.
    heatmap_b64 = _build_heatmap(input_tensor, display_img)

    # ── 4. Risk bucket ─────────────────────────────────────────────────────────
    if score < 31:
        risk = 'Real'
    elif score < 61:
        risk = 'Uncertain'
    else:
        risk = 'Likely Fake'

    return {
        'score'        : score,
        'risk'         : risk,
        'p_fake'       : round(p_fake, 4),
        'face_detected': face_detected,
        'heatmap_b64'  : heatmap_b64,
    }


def _build_heatmap(input_tensor: torch.Tensor, display_img: np.ndarray) -> str | None:
    """
    Generate a Grad-CAM overlay and return it as a base-64 PNG string.
    Returns None (gracefully) if anything goes wrong so the rest of the
    response is still delivered to the client.
    """
    try:
        # Fresh tensor with gradients — completely detached from the no_grad graph
        cam_input = input_tensor.clone().detach().requires_grad_(True)

        # GradCAM runs its own forward + backward internally
        grayscale_cam = cam(input_tensor=cam_input)   # shape: (1, H, W)
        grayscale_cam = grayscale_cam[0]              # shape: (H, W)

        # Normalise display image to [0, 1] float for overlay
        img_float = display_img.astype(np.float32) / 255.0
        if img_float.shape[:2] != grayscale_cam.shape:
            # Resize display image to match cam output just in case
            from PIL import Image as _PIL
            pil_tmp   = _PIL.fromarray(display_img).resize(
                (grayscale_cam.shape[1], grayscale_cam.shape[0]),
                resample=_PIL.BILINEAR,
            )
            img_float = np.array(pil_tmp).astype(np.float32) / 255.0

        cam_image = show_cam_on_image(img_float, grayscale_cam, use_rgb=True)

        buf = io.BytesIO()
        Image.fromarray(cam_image).save(buf, format='PNG')
        return base64.b64encode(buf.getvalue()).decode()

    except Exception:
        print("[WARN] GradCAM failed — returning None heatmap")
        traceback.print_exc()
        return None

# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ClarifAI running", "device": str(DEVICE)}


@app.get("/health")
def health():
    return {
        "status"   : "ok",
        "device"   : str(DEVICE),
        "model_auc": checkpoint['auc'],
    }


@app.post("/detect", dependencies=[Depends(verify_api_key)])
@limiter.limit("20/minute")
async def detect(request: Request, file: UploadFile = File(...)):
    # ── Validate ───────────────────────────────────────────────────────────────
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(400, "Only JPEG, PNG, WebP allowed")

    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(400, "File too large — max 10 MB")

    # ── Infer ──────────────────────────────────────────────────────────────────
    try:
        start  = time.time()
        img    = Image.open(io.BytesIO(contents)).convert('RGB')
        result = run_inference(img)
        processing_ms = int((time.time() - start) * 1000)

        score = result['score']

        return {
            "score"             : score,
            "label"             : "FAKE" if score >= 50 else "REAL",
            "confidence"        : score if score >= 50 else 100 - score,
            "risk_level"        : result['risk'],
            "face_detected"     : result['face_detected'],
            "heatmap_b64"       : result['heatmap_b64'],   # None → frontend shows placeholder
            "processing_time_ms": processing_ms,
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"Inference failed: {str(e)}")