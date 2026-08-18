#!/usr/bin/env bash
echo "==================================================="
echo "  PROJECT ZOMBOID DEDICATED SERVER CONTROL CENTER  "
echo "==================================================="
echo ""
echo "Starting backend server on http://localhost:3001 ..."
echo ""

# Try opening browser on Linux if desktop environment is present
if which xdg-open > /dev/null; then
  xdg-open http://localhost:3001 &
elif which open > /dev/null; then
  open http://localhost:3001 &
fi

node server/index.js
