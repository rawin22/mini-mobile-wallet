#!/bin/bash
set -e

# Kill any existing Expo / Metro processes
pkill -f "expo start" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true
sleep 1

# Load nvm and use Node 22
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22

cd "$(dirname "$0")"

# Install deps if node_modules is missing
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install --legacy-peer-deps
fi

echo "Starting Expo with tunnel + clear cache..."
npx expo start --tunnel --clear
