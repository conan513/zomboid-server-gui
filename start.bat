@echo off
title Project Zomboid Server Control Center
echo ===================================================
echo   PROJECT ZOMBOID DEDICATED SERVER CONTROL CENTER
echo ===================================================
echo.
echo Starting backend server on http://localhost:3001 ...
echo.

start http://localhost:3001
node server/index.js
pause
