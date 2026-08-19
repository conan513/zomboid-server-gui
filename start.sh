#!/usr/bin/env bash
echo "==================================================="
echo "  PROJECT ZOMBOID DEDICATED SERVER CONTROL CENTER  "
echo "==================================================="
echo ""

# Ensure backend dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "[*] Installing backend dependencies..."
  npm install
fi

# Ensure frontend is built
if [ ! -f "client/dist/index.html" ]; then
  echo "[!] Frontend build not found (client/dist/index.html)."
  echo "[*] Building React frontend client..."
  if [ ! -d "client/node_modules" ]; then
    echo "[*] Installing client dependencies..."
    npm --prefix client install
  fi
  npm --prefix client run build
  echo "[+] Client build completed successfully!"
  echo ""
fi

echo "Starting backend server on http://localhost:3001 ..."
echo ""

# Try opening browser on Linux if desktop environment is present
if which xdg-open > /dev/null 2>&1; then
  xdg-open http://localhost:3001 &
elif which open > /dev/null 2>&1; then
  open http://localhost:3001 &
fi

node server/index.js

