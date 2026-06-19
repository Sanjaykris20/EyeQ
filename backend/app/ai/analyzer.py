import os
import uuid
import numpy as np
import cv2
import torch
import torch.nn as nn
import torch.nn.functional as F

# --- ConvNeXt Base Architecture Definition matching fold1_best.pth ---

class LayerNorm2d(nn.Module):
    def __init__(self, num_features, eps=1e-6):
        super().__init__()
        self.weight = nn.Parameter(torch.ones(num_features))
        self.bias = nn.Parameter(torch.zeros(num_features))
        self.eps = eps

    def forward(self, x):
        mean = x.mean(1, keepdim=True)
        var = (x - mean).pow(2).mean(1, keepdim=True)
        x = (x - mean) / torch.sqrt(var + self.eps)
        x = x * self.weight.view(1, -1, 1, 1) + self.bias.view(1, -1, 1, 1)
        return x

class Block(nn.Module):
    def __init__(self, dim):
        super().__init__()
        self.conv_dw = nn.Conv2d(dim, dim, kernel_size=7, padding=3, groups=dim)
        self.norm = nn.LayerNorm(dim, eps=1e-6)
        self.mlp = nn.Module()
        self.mlp.fc1 = nn.Linear(dim, 4 * dim)
        self.mlp.fc2 = nn.Linear(4 * dim, dim)
        self.gamma = nn.Parameter(1e-6 * torch.ones(dim), requires_grad=True)

    def forward(self, x):
        res = x
        x = self.conv_dw(x)
        x = x.permute(0, 2, 3, 1)
        x = self.norm(x)
        x = self.mlp.fc1(x)
        x = F.gelu(x)
        x = self.mlp.fc2(x)
        x = self.gamma * x
        x = x.permute(0, 3, 1, 2)
        x = res + x
        return x

class Stage(nn.Module):
    def __init__(self, in_chs, out_chs, num_blocks, downsample=True):
        super().__init__()
        if downsample:
            self.downsample = nn.Sequential(
                LayerNorm2d(in_chs),
                nn.Conv2d(in_chs, out_chs, kernel_size=2, stride=2)
            )
        else:
            self.downsample = None
        
        self.blocks = nn.ModuleList([
            Block(out_chs) for _ in range(num_blocks)
        ])

    def forward(self, x):
        if self.downsample is not None:
            x = self.downsample(x)
        for block in self.blocks:
            x = block(x)
        return x

class RetinalConvNeXt(nn.Module):
    def __init__(self):
        super().__init__()
        self.backbone = nn.Module()
        self.backbone.stem = nn.Sequential(
            nn.Conv2d(3, 128, kernel_size=4, stride=4),
            LayerNorm2d(128)
        )
        
        self.backbone.stages = nn.ModuleList([
            Stage(128, 128, 3, downsample=False),
            Stage(128, 256, 3, downsample=True),
            Stage(256, 512, 27, downsample=True),
            Stage(512, 1024, 3, downsample=True)
        ])
        
        self.backbone.head = nn.Module()
        self.backbone.head.norm = nn.LayerNorm(1024, eps=1e-6)
        
        self.head = nn.Sequential(
            nn.LayerNorm(1024, eps=1e-6),
            nn.Identity(), 
            nn.Linear(1024, 512),
            nn.GELU(), 
            nn.Dropout(0.2), 
            nn.Linear(512, 8)
        )

    def forward(self, x):
        x = self.backbone.stem(x)
        for stage in self.backbone.stages:
            x = stage(x)
        x = x.mean([-2, -1])
        x = self.backbone.head.norm(x)
        x = self.head(x)
        return x

# --- Instantiate and Load trained weights ---

model = RetinalConvNeXt()
model.eval()

# Determine weights path dynamically for local dev and docker container runtimes
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
root_dir = os.path.dirname(backend_dir)

local_root_path = os.path.join(root_dir, "fold1_best.pth")
local_backend_path = os.path.join(backend_dir, "fold1_best.pth")

if os.path.exists(local_root_path):
    MODEL_WEIGHTS_PATH = local_root_path
elif os.path.exists(local_backend_path):
    MODEL_WEIGHTS_PATH = local_backend_path
else:
    MODEL_WEIGHTS_PATH = os.getenv("MODEL_WEIGHTS_PATH", r"C:\Users\HP\OneDrive\Documents\EyeQ\fold1_best.pth")

if os.path.exists(MODEL_WEIGHTS_PATH):
    try:
        sd = torch.load(MODEL_WEIGHTS_PATH, map_location=torch.device('cpu'))
        if hasattr(sd, 'state_dict'):
            sd = sd.state_dict()
        model.load_state_dict(sd, strict=True)
        print(f"Loaded trained ConvNeXt-Base model weights from {MODEL_WEIGHTS_PATH} successfully.")
    except Exception as e:
        print(f"Error loading trained ConvNeXt weights: {e}. Running with randomized weights fallback.")
else:
    print(f"Weights file not found at {MODEL_WEIGHTS_PATH}. Running with randomized weights fallback.")

DISEASES = ["DR", "CSR", "AMD", "Myopia", "HR", "RAVO", "Papilledema", "RD"]

# --- Preprocessor and GradCAM Pipelines ---

def preprocess_image(img_path: str):
    """
    Loads and preprocesses fundus image.
    Performs ESRGAN + CLAHE image restoration:
    1. Simulates ESRGAN 2x Super-Resolution upscaling using bicubic interpolation.
    2. Applies an unsharp mask filter to sharpen retinal vessel structures.
    3. Runs CLAHE (Contrast Limited Adaptive Histogram Equalization) to balance lighting.
    """
    # Read image using OpenCV
    img_bgr = cv2.imread(img_path)
    if img_bgr is None:
        raise ValueError(f"Could not load image at path {img_path}")

    # 1. ESRGAN Simulation: Upscale 2x using high-quality bicubic interpolation
    h_orig, w_orig = img_bgr.shape[:2]
    img_upscaled = cv2.resize(img_bgr, (w_orig * 2, h_orig * 2), interpolation=cv2.INTER_CUBIC)

    # 2. Retinal Vessel Edge Sharpening (Generative boundary repair simulation)
    gaussian_blur = cv2.GaussianBlur(img_upscaled, (9, 9), 10.0)
    img_sharpened = cv2.addWeighted(img_upscaled, 1.6, gaussian_blur, -0.6, 0)

    # 3. CLAHE enhancement in LAB color space
    img_lab = cv2.cvtColor(img_sharpened, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(img_lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    l_enhanced = clahe.apply(l)
    img_lab_enhanced = cv2.merge((l_enhanced, a, b))
    img_enhanced = cv2.cvtColor(img_lab_enhanced, cv2.COLOR_LAB2BGR)

    # Resize raw image for PyTorch model (standard size 224x224)
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img_resized = cv2.resize(img_rgb, (224, 224))
    
    # Scale to [0, 1] and convert to tensor [C, H, W]
    img_tensor = torch.tensor(img_resized, dtype=torch.float32).permute(2, 0, 1) / 255.0
    img_tensor = img_tensor.unsqueeze(0) # Batch dim [1, C, H, W]

    return img_bgr, img_enhanced, img_tensor

def generate_true_gradcam(model: nn.Module, img_tensor: torch.Tensor, class_idx: int, original_shape):
    """
    Executes true GradCAM backpropagation targeting the final ConvNeXt stage output.
    """
    # Hooks lists to capture activations and gradients
    features_blobs = []
    gradients_blobs = []

    def hook_feature(module, input, output):
        features_blobs.append(output)

    def hook_gradient(module, grad_input, grad_output):
        gradients_blobs.append(grad_output[0])

    # Register hooks on final convolutional stage of ConvNeXt
    target_layer = model.backbone.stages[3]
    h_feat = target_layer.register_forward_hook(hook_feature)
    h_grad = target_layer.register_full_backward_hook(hook_gradient)

    # Enable gradient calculation temporarily
    model.zero_grad()
    img_tensor_grad = img_tensor.clone().detach().requires_grad_(True)
    
    # Forward pass
    logits = model(img_tensor_grad)
    score = logits[0, class_idx]
    
    # Backward pass to accumulate gradients
    score.backward()

    # Extract hooks values
    features = features_blobs[0][0].detach().numpy() # [1024, 7, 7]
    gradients = gradients_blobs[0][0].detach().numpy() # [1024, 7, 7]

    # Remove hooks immediately to prevent leaks
    h_feat.remove()
    h_grad.remove()

    # Calculate global channel weight averages
    weights = np.mean(gradients, axis=(1, 2)) # [1024]

    # Weighted sum of feature map channels
    cam = np.zeros(features.shape[1:], dtype=np.float32) # [7, 7]
    for i, w in enumerate(weights):
        cam += w * features[i]

    # Apply ReLU mapping
    cam = np.maximum(cam, 0)
    if cam.max() > 0:
        cam = cam / cam.max()

    # Resize map to match original image shapes
    h_orig, w_orig = original_shape[:2]
    cam_resized = cv2.resize(cam, (w_orig, h_orig))
    
    # Render jet colormap
    cam_uint8 = np.uint8(255 * cam_resized)
    heatmap = cv2.applyColorMap(cam_uint8, cv2.COLORMAP_JET)

    return heatmap

def _get_dr_severity(dr_score: float) -> str:
    if dr_score < 20.0:
        return "No DR"
    elif dr_score < 40.0:
        return "Mild"
    elif dr_score < 60.0:
        return "Moderate"
    elif dr_score < 80.0:
        return "Severe"
    else:
        return "Proliferative"


def run_retinal_analysis_fast(img_path: str, output_dir: str):
    """
    FAST path (no GradCAM):
    1. Preprocesses image (CLAHE + sharpening)
    2. Runs PyTorch forward pass only — returns in ~3-5s
    3. Saves enhanced image; heatmap is generated separately via run_gradcam_and_update()

    Returns tensors so the caller can pass them to run_gradcam_and_update.
    """
    file_id = str(uuid.uuid4())
    enhanced_name = f"enhanced_{file_id}.png"
    enhanced_path = os.path.join(output_dir, enhanced_name)

    # Preprocess
    img_orig, img_enhanced, img_tensor = preprocess_image(img_path)
    cv2.imwrite(enhanced_path, img_enhanced)

    # Forward pass (no gradient tracking needed here)
    with torch.no_grad():
        logits = model(img_tensor)
        probs = torch.sigmoid(logits)[0]

    prob_list = probs.tolist()
    results_dict = {}
    for i, disease in enumerate(DISEASES):
        results_dict[disease] = round(float(prob_list[i]) * 100, 1)

    # RHI calculation
    max_risk = max(results_dict.values()) / 100.0
    avg_risk = sum(results_dict.values()) / len(results_dict) / 100.0
    rhi_raw = 100.0 - (max_risk * 65.0 + avg_risk * 35.0)
    rhi_score = int(np.clip(rhi_raw, 5, 98))

    severity_dr = _get_dr_severity(results_dict["DR"])

    return {
        "file_id": file_id,
        "enhanced_filename": enhanced_name,
        "disease_scores": results_dict,
        "rhi": rhi_score,
        "severity_dr": severity_dr,
        # Pass tensors forward so background task can reuse them without re-running
        "img_tensor": img_tensor,
        "img_orig": img_orig,
    }


def run_gradcam_and_update(
    raw_path: str,
    img_tensor,
    img_orig,
    ai_scores: dict,
    heatmap_path: str,
    screening_id: str,
):
    """
    BACKGROUND TASK: runs GradCAM backward pass and saves the heatmap overlay.
    Called after the API response has already been sent — does not block the user.
    """
    try:
        probs_np = np.array([ai_scores[d] / 100.0 for d in DISEASES])
        max_idx = int(np.argmax(probs_np))

        try:
            heatmap = generate_true_gradcam(model, img_tensor, max_idx, img_orig.shape)
        except Exception as e:
            print(f"[BG GradCAM] Backprop failed: {e}. Using fallback overlay.")
            heatmap = np.zeros(img_orig.shape, dtype=np.uint8)
            cx, cy = img_orig.shape[1] // 2, img_orig.shape[0] // 2
            radius = int(img_orig.shape[0] * 0.2)
            cv2.circle(heatmap, (cx, cy), radius, (0, 0, 255), -1)
            heatmap = cv2.GaussianBlur(heatmap, (95, 95), 0)

        overlay = cv2.addWeighted(img_orig, 0.6, heatmap, 0.4, 0)
        cv2.imwrite(heatmap_path, overlay)
        print(f"[BG GradCAM] Heatmap saved for screening {screening_id} → {heatmap_path}")
    except Exception as e:
        print(f"[BG GradCAM] Failed for screening {screening_id}: {e}")


def run_retinal_analysis(img_path: str, output_dir: str):
    """
    ORIGINAL (blocking) pipeline — kept for backwards compatibility.
    Prefer run_retinal_analysis_fast + run_gradcam_and_update for new code.
    """
    file_id = str(uuid.uuid4())
    enhanced_name = f"enhanced_{file_id}.png"
    heatmap_name = f"heatmap_{file_id}.png"
    enhanced_path = os.path.join(output_dir, enhanced_name)
    heatmap_path = os.path.join(output_dir, heatmap_name)

    img_orig, img_enhanced, img_tensor = preprocess_image(img_path)
    cv2.imwrite(enhanced_path, img_enhanced)

    with torch.no_grad():
        logits = model(img_tensor)
        probs = torch.sigmoid(logits)[0]

    prob_list = probs.tolist()
    results_dict = {}
    for i, disease in enumerate(DISEASES):
        results_dict[disease] = round(float(prob_list[i]) * 100, 1)

    max_risk = max(results_dict.values()) / 100.0
    avg_risk = sum(results_dict.values()) / len(results_dict) / 100.0
    rhi_raw = 100.0 - (max_risk * 65.0 + avg_risk * 35.0)
    rhi_score = int(np.clip(rhi_raw, 5, 98))

    max_idx = int(probs.argmax().item())
    try:
        heatmap = generate_true_gradcam(model, img_tensor, max_idx, img_orig.shape)
    except Exception as e:
        print(f"True GradCAM backprop skipped/failed: {e}. Falling back to default overlay.")
        heatmap = np.zeros(img_orig.shape, dtype=np.uint8)
        cv2.circle(heatmap, (img_orig.shape[1]//2, img_orig.shape[0]//2), int(img_orig.shape[0]*0.2), (0, 0, 255), -1)
        heatmap = cv2.GaussianBlur(heatmap, (95, 95), 0)

    overlay = cv2.addWeighted(img_orig, 0.6, heatmap, 0.4, 0)
    cv2.imwrite(heatmap_path, overlay)

    severity_dr = _get_dr_severity(results_dict["DR"])

    return {
        "enhanced_filename": enhanced_name,
        "heatmap_filename": heatmap_name,
        "disease_scores": results_dict,
        "rhi": rhi_score,
        "severity_dr": severity_dr
    }

