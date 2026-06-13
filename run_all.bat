@echo off
title EyeQ Innovate Platform Launcher
echo ====================================================================
echo               EYEQ INNOVATE RETINAL AI PLATFORM
echo ====================================================================
echo.

echo [1/3] Seeding clinical database and drawing fundus scan assets...
python backend/seed.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to run seeder script. Verify Python environment.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Launching FastAPI Backend on http://localhost:8000 ...
start "EyeQ Backend Server" cmd /c "cd backend && python start.py"

echo.
echo [3/3] Launching Next.js Frontend on http://localhost:3000 ...
cd frontend
npm run dev
