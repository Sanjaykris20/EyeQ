import cv2
import numpy as np
import pandas as pd
import os
import sys

output_dir = 'c:/Users/HP/OneDrive/Documents/EyeQ/data/crops_new'
os.makedirs(output_dir, exist_ok=True)

def crop_collage(img_path, start_idx):
    img = cv2.imread(img_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 30, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    retinas = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if w > 100 and h > 100:
            retinas.append((x, y, w, h))
            
    # Sort into rows and columns. Assume 2 rows, 5 columns
    retinas = sorted(retinas, key=lambda b: b[1])
    sorted_retinas = []
    
    # Try to group by row
    if len(retinas) >= 10:
        row1 = sorted(retinas[:5], key=lambda b: b[0])
        row2 = sorted(retinas[-5:], key=lambda b: b[0])
        sorted_retinas.extend(row1)
        sorted_retinas.extend(row2)
    else:
        sorted_retinas = retinas

    paths = {}
    for i, (x, y, w, h) in enumerate(sorted_retinas):
        if i >= 10: break
        patient_id = f"EYEQ{start_idx + i:03d}"
        crop = img[y:y+h, x:x+w]
        crop_path = os.path.join(output_dir, f"{patient_id}.png")
        cv2.imwrite(crop_path, crop)
        paths[patient_id] = crop_path
    return paths

paths1 = crop_collage('c:/Users/HP/OneDrive/Documents/EyeQ/paitents 1-10.png', 101)
paths2 = crop_collage('c:/Users/HP/OneDrive/Documents/EyeQ/paitents 11-20.png', 111)

print(f"Cropped images to {output_dir}")
