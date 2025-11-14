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

# Copy frontend build to compute (para que el servidor pueda servirlo)
echo "🎨 Copying frontend to compute/default/dist..."
if [ -d "dist" ]; then
  cp -r dist .amplify-hosting/compute/default/
  echo "✅ Frontend copied to compute/default/dist"
  ls -la .amplify-hosting/compute/default/dist/ | head -10
else
  echo "⚠️  WARNING: dist directory not found!"
fi

# Install only production dependencies
echo "📦 Installing production dependencies..."
cd .amplify-hosting/compute/default
npm install --production --no-optional
cd ../../..

# Copy frontend build to static (para archivos estáticos servidos por Amplify)
echo "🎨 Copying frontend static files to static/..."
if [ -d "dist" ]; then
  cp -r dist/* .amplify-hosting/static/
  echo "✅ Frontend copied to static/"
  ls -la .amplify-hosting/static/ | head -10
else
  echo "⚠️  WARNING: dist directory not found for static!"
fi

# Copy deploy manifest
echo "📋 Copying deploy manifest..."
cp deploy-manifest.json .amplify-hosting/

# Generate .env file for compute runtime from Amplify environment variables
echo ""
echo "🔐 Generating .env file for compute runtime..."
cat > .amplify-hosting/compute/default/.env << EOF
# Database Configuration
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_DATABASE=${DB_DATABASE}
DB_USERNAME=${DB_USERNAME}
DB_PASSWORD=${DB_PASSWORD}

# AWS Configuration
APP_AWS_ACCESS_KEY_ID=${APP_AWS_ACCESS_KEY_ID}
APP_AWS_SECRET_ACCESS_KEY=${APP_AWS_SECRET_ACCESS_KEY}
APP_AWS_REGION=${APP_AWS_REGION}
APP_AWS_S3_BUCKET=${APP_AWS_S3_BUCKET}
REKOGNITION_COLLECTION_ID=${REKOGNITION_COLLECTION_ID}

# Server Configuration
NODE_ENV=${NODE_ENV}
PORT=${PORT}
ADMIN_SECRET_KEY=${ADMIN_SECRET_KEY}
FRONTEND_URL=${FRONTEND_URL}
EOF

echo "✅ .env file created for compute runtime"
echo "📋 Variables configured:"
echo "   DB_HOST: ${DB_HOST:0:10}*** (${#DB_HOST} chars)"
echo "   DB_DATABASE: ${DB_DATABASE}"
echo "   AWS_REGION: ${APP_AWS_REGION}"
echo "   NODE_ENV: ${NODE_ENV}"
echo ""

echo ""
echo "✅ Deployment preparation complete!"
echo ""
echo "📂 DEPLOYMENT STRUCTURE:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 .amplify-hosting/"
ls -lh .amplify-hosting/ | grep -v total
echo ""
echo "📁 .amplify-hosting/compute/default/ (Express Server)"
ls -lh .amplify-hosting/compute/default/ | grep -v total | head -15
echo ""
echo "📁 .amplify-hosting/compute/default/dist/ (Frontend for Server)"
if [ -d .amplify-hosting/compute/default/dist ]; then
  ls -lh .amplify-hosting/compute/default/dist/ | grep -v total | head -10
else
  echo "⚠️  dist directory not found in compute!"
fi
echo ""
echo "📁 .amplify-hosting/static/ (Static Assets)"
ls -lh .amplify-hosting/static/ | grep -v total | head -10
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Ready for Amplify deployment!"
echo ""
