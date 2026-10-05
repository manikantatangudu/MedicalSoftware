@echo off
echo ========================================================
echo Starting Cloudflare Secure Public Tunnel...
echo Forwarding to local frontend (http://localhost:5173)...
echo.
echo Look for the public URL ending in: .trycloudflare.com
echo Share that URL with Sai Vinod to test from Parvathipuram!
echo ========================================================
echo.
cloudflared.exe tunnel --url http://localhost:5173
pause
