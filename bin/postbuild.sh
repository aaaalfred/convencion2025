#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Amplify deployment preparation..."

# Create deployment directories
echo "📁 Creating deployment structure..."
mkdir -p .amplify-hosting/compute/default
mkdir -p .amplify-hosting/static

# Copy backend server files
echo "📦 Copying backend files..."
cp server.js .amplify-hosting/compute/default/
cp package.json .amplify-hosting/compute/default/
cp package-lock.json .amplify-hosting/compute/default/ 2>/dev/null || true

# Copy backend dependencies
echo "📚 Copying lib and scripts..."
cp -r lib .amplify-hosting/compute/default/ 2>/dev/null || true
cp -r scripts .amplify-hosting/compute/default/ 2>/dev/null || true

# Install only production dependencies
echo "📦 Installing production dependencies..."
cd .amplify-hosting/compute/default
npm install --production --no-optional
cd ../../..

# Copy frontend build to static
echo "🎨 Copying frontend static files..."
cp -r dist/* .amplify-hosting/static/

# Copy deploy manifest
echo "📋 Copying deploy manifest..."
cp deploy-manifest.json .amplify-hosting/

# Create .env file in compute if exists
if [ -f .env ]; then
  echo "🔐 Copying environment variables..."
  cp .env .amplify-hosting/compute/default/
fi

echo "✅ Deployment preparation complete!"
echo "📂 Deployment structure:"
ls -la .amplify-hosting/
ls -la .amplify-hosting/compute/default/
ls -la .amplify-hosting/static/
