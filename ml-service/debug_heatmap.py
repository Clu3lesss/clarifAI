"""
Diagnostic script to inspect why GradCAM produces a blank heatmap.
Run: python debug_heatmap.py test.jpg
"""
import sys, io, base64, warnings
warnings.filterwarnings('ignore', category=FutureWarning)

import torch
import torch.nn as nn
import numpy as np
from PIL import Image
from torchvision.models import efficientnet_b4
import torchvision.transforms as T
from facenet_pytorch import MTCNN
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image

DEVICE = torch.device('cpu')

# ── Load model ─────────────────────────────────────────────────────────────────
checkpoint = torch.load('models/clarifai_inference.pth', map_location=DEVICE, weights_only=False)
CLASS_TO_IDX = checkpoint['class_to_idx']
FAKE_IDX = CLASS_TO_IDX['fake']
print(f"class_to_idx = {CLASS_TO_IDX}")
print(f"FAKE_IDX     = {FAKE_IDX}")

model = efficientnet_b4(weights=None)
model.classifier[1] = nn.Linear(1792, 2)
model.load_state_dict(checkpoint['model_state_dict'])
model = model.to(DEVICE)
model.eval()

mtcnn = MTCNN(image_size=224, margin=20, keep_all=False, post_process=False, device=DEVICE)

_normalize = T.Compose([
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

_fallback_transform = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# ── Load image ─────────────────────────────────────────────────────────────────
img_path = sys.argv[1] if len(sys.argv) > 1 else 'test.jpg'
img = Image.open(img_path).convert('RGB')
print(f"\nImage: {img_path}, size={img.size}")

# ── Face detection ─────────────────────────────────────────────────────────────
face_tensor = mtcnn(img)
if face_tensor is not None:
    print(f"Face detected! tensor shape={face_tensor.shape}, dtype={face_tensor.dtype}")
    print(f"  min={face_tensor.min().item():.2f}, max={face_tensor.max().item():.2f}")
    face_np = face_tensor.permute(1, 2, 0).cpu().numpy().clip(0, 255).astype(np.uint8)
    face_pil = Image.fromarray(face_np)
    input_tensor = _normalize(face_pil).unsqueeze(0).to(DEVICE)
    display_img = face_np
else:
    print("No face detected, using full-image fallback")
    resized = img.resize((224, 224))
    input_tensor = _fallback_transform(resized).unsqueeze(0).to(DEVICE)
    display_img = np.array(resized)

print(f"\ninput_tensor: shape={input_tensor.shape}, dtype={input_tensor.dtype}")
print(f"  min={input_tensor.min().item():.4f}, max={input_tensor.max().item():.4f}")
print(f"display_img: shape={display_img.shape}, dtype={display_img.dtype}")
print(f"  min={display_img.min()}, max={display_img.max()}")

# ── Prediction ─────────────────────────────────────────────────────────────────
with torch.no_grad():
    logits = model(input_tensor)
    probs = torch.softmax(logits, dim=1)
    print(f"\nLogits: {logits}")
    print(f"Probs:  {probs}")
    print(f"p_fake: {probs[0][FAKE_IDX].item():.4f}")

# ── GradCAM ────────────────────────────────────────────────────────────────────
print("\n--- GradCAM diagnostics ---")
target_layer = model.features[-1]
print(f"Target layer: {type(target_layer).__name__}")

cam = GradCAM(model=model, target_layers=[target_layer])

cam_input = input_tensor.clone().detach().requires_grad_(True)
print(f"cam_input requires_grad: {cam_input.requires_grad}")

# Run without specifying targets (defaults to highest-scoring class)
grayscale_cam = cam(input_tensor=cam_input)
print(f"\ngrayscale_cam shape: {grayscale_cam.shape}")
print(f"  min={grayscale_cam.min():.6f}, max={grayscale_cam.max():.6f}, mean={grayscale_cam.mean():.6f}")
print(f"  unique values count: {len(np.unique(grayscale_cam))}")
print(f"  all zeros? {np.allclose(grayscale_cam, 0)}")
print(f"  all same value? {np.allclose(grayscale_cam, grayscale_cam.flat[0])}")

grayscale_cam = grayscale_cam[0]

# Check if problem is in the overlay step
img_float = display_img.astype(np.float32) / 255.0
print(f"\nimg_float: shape={img_float.shape}, min={img_float.min():.4f}, max={img_float.max():.4f}")

if img_float.shape[:2] != grayscale_cam.shape:
    print(f"  Shape mismatch! img={img_float.shape[:2]} vs cam={grayscale_cam.shape}")
    pil_tmp = Image.fromarray(display_img).resize(
        (grayscale_cam.shape[1], grayscale_cam.shape[0]), resample=Image.BILINEAR
    )
    img_float = np.array(pil_tmp).astype(np.float32) / 255.0
    print(f"  Resized to: {img_float.shape}")

cam_image = show_cam_on_image(img_float, grayscale_cam, use_rgb=True)
print(f"\ncam_image: shape={cam_image.shape}, dtype={cam_image.dtype}")
print(f"  min={cam_image.min()}, max={cam_image.max()}")
print(f"  all same pixel? {np.all(cam_image == cam_image[0, 0])}")

# Save debug images
Image.fromarray(cam_image).save('debug_heatmap.png')
Image.fromarray(display_img).save('debug_display_img.png')
print("\nSaved debug_heatmap.png and debug_display_img.png")

# Save grayscale cam as image for visual inspection
cam_visual = (grayscale_cam * 255).clip(0, 255).astype(np.uint8)
Image.fromarray(cam_visual).save('debug_cam_raw.png')
print("Saved debug_cam_raw.png (raw CAM values as grayscale)")
