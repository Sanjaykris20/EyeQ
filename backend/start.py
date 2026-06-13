import uvicorn
import os

if __name__ == "__main__":
    # Ensure static directories exist before startup
    os.makedirs("static/uploads", exist_ok=True)
    os.makedirs("static/reports", exist_ok=True)
    
    print("Starting EyeQ Innovate Backend Server on http://localhost:8000 ...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
