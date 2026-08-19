@echo off
title Project Zomboid Server Control Center
echo ===================================================
echo   PROJECT ZOMBOID DEDICATED SERVER CONTROL CENTER
echo ===================================================
echo.

if not exist "node_modules\" (
    echo [*] Installing backend dependencies...
    call npm install
)

if not exist "client\dist\index.html" (
    echo [!] Frontend build not found. Building React client...
    if not exist "client\node_modules\" (
        echo [*] Installing client dependencies...
        call npm --prefix client install
    )
    call npm --prefix client run build
    echo [+] Client build completed successfully!
    echo.
)

echo Starting backend server on http://localhost:3001 ...
echo.

start http://localhost:3001
node server/index.js
pause
