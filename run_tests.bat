@echo off
title Medical Software - Automated Test Suite
color 0B
echo ========================================================
echo   Medical Store SaaS - Running Automated Test Suite
echo ========================================================
echo.

cd /d "%~dp0backend"

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Python virtual environment not found in backend/.venv!
    pause
    exit /b 1
)

echo Running all 25 automated business scenario tests...
echo.
.venv\Scripts\python.exe -m pytest tests/ -v --tb=short

echo.
echo ========================================================
echo   Test Execution Complete!
echo ========================================================
pause
