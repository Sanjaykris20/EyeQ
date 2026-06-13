FROM python:3.11-slim

# Install system dependencies (including PostgreSQL client dev files and basic graphics libraries for OpenCV headless)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements file first to leverage docker layer caching
COPY backend/requirements.txt .

# Install PyTorch CPU-only runtime to keep container image size minimal (excludes heavy CUDA packages)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install the rest of the python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy code modules and pretrained model weights
COPY backend/app/ app/
COPY fold1_best.pth .
COPY backend/seed.py .

# Generate SQLite database and initial mock images
RUN python seed.py

# Expose server port
EXPOSE 8000

# Start server using uvicorn binding to dynamic port (Railway sets $PORT)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
