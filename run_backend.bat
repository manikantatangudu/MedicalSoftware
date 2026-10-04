@echo off
echo ========================================================
echo Starting Medical Store Billing Backend (FastAPI)...
echo Swagger Interactive API Docs: http://localhost:8000/docs
echo ========================================================
cd backend
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
