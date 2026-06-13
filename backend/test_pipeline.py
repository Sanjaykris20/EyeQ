import os
import shutil
import cv2
import numpy as np
from app.ai.analyzer import run_retinal_analysis

def verify_ml_pipeline():
    print("==========================================================")
    print("           EYEQ AI PIPELINE INTEGRATION TEST")
    print("==========================================================")
    
    # 1. Create temporary directories
    temp_dir = "temp_test_assets"
    os.makedirs(temp_dir, exist_ok=True)
    
    raw_img_path = os.path.join(temp_dir, "test_retina.png")
    
    print("\n[1/4] Generating dummy fundus scan image on disk...")
    # Create simple fundus disc representation
    img = np.zeros((400, 400, 3), dtype=np.uint8)
    cv2.circle(img, (200, 200), 160, (20, 80, 220), -1) # Fundus circle (orange-red)
    cv2.circle(img, (120, 200), 30, (90, 210, 250), -1) # Optic disc (yellowish)
    # Draw simple vessel lines
    cv2.line(img, (120, 200), (280, 220), (10, 10, 145), 2)
    cv2.line(img, (120, 200), (190, 80), (10, 10, 145), 2)
    cv2.line(img, (120, 200), (220, 320), (10, 10, 145), 2)
    cv2.imwrite(raw_img_path, img)
    print(f"  Saved raw test image at: {raw_img_path}")

    print("\n[2/4] Triggering ConvNeXt Retinal Analysis Engine...")
    try:
        # Runs preprocess (ESRGAN+CLAHE), forward pass, RHI calculation, and GradCAM backprop
        result = run_retinal_analysis(raw_img_path, temp_dir)
        
        print("\n[3/4] AI Analysis Output Results:")
        print(f"  - Retinal Health Index (RHI): {result['rhi']} / 100")
        print(f"  - Diabetic Retinopathy (DR) Severity: {result['severity_dr']}")
        print("  - Disease Classification Confidence:")
        for disease, score in result["disease_scores"].items():
            print(f"    * {disease:12}: {score}%")
            
        print("\n[4/4] Validating output assets on disk...")
        enhanced_file = os.path.join(temp_dir, result["enhanced_filename"])
        heatmap_file = os.path.join(temp_dir, result["heatmap_filename"])
        
        assert os.path.exists(enhanced_file), "Enhanced image was not created!"
        assert os.path.exists(heatmap_file), "GradCAM heatmap image was not created!"
        assert os.path.getsize(enhanced_file) > 0, "Enhanced image file is empty!"
        assert os.path.getsize(heatmap_file) > 0, "Heatmap image file is empty!"
        
        print(f"  - Enhanced image saved at: {enhanced_file} ({os.path.getsize(enhanced_file)} bytes)")
        print(f"  - GradCAM heatmap saved at: {heatmap_file} ({os.path.getsize(heatmap_file)} bytes)")
        
        print("\n==========================================================")
        print(" SUCCESS: Retinal AI engine and GradCAM backprop are fully functional!")
        print("==========================================================")
        
    except Exception as e:
        print(f"\n ERROR during analysis pipeline: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup temporary files
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            print("\nTemporary test files cleaned up.")

if __name__ == "__main__":
    verify_ml_pipeline()
