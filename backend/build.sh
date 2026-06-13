#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Installing Python Dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# --- AI MODEL DOWNLOAD SECTION ---
# Render has a 100MB file limit if pushing from GitHub. 
# Since fold1_best.pth is ~500MB, we download it during the build process instead!
#
# INSTRUCTIONS:
# 1. Upload your 'fold1_best.pth' file to Google Drive.
# 2. Make it "Anyone with the link can view".
# 3. Get the File ID from the link (e.g., https://drive.google.com/file/d/YOUR_FILE_ID/view)
# 4. Replace 'YOUR_FILE_ID_HERE' below with your actual File ID!

MODEL_FILE="../fold1_best.pth"
FILE_ID="YOUR_FILE_ID_HERE"

if [ ! -f "$MODEL_FILE" ]; then
    echo "AI Model not found locally. Downloading from Google Drive..."
    # Install gdown to download from Google Drive
    pip install gdown
    gdown --id "$FILE_ID" -O "$MODEL_FILE"
    echo "AI Model downloaded successfully!"
else
    echo "AI Model already exists."
fi

echo "Build Completed!"
