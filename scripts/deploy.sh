#!/bin/bash

# FWEA-I Production Deployment Script
# Supports GitHub, VSCode, Cloudflare, Wix, and Stripe integration

set -e

echo "🚀 Starting FWEA-I deployment pipeline..."
echo "🌍 Deploying omnilingual audio processing platform"
echo "📊 Supporting 197 languages worldwide"
echo ""

# Color codes for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required environment variables are set
echo "🔧 Checking environment configuration..."
required_vars=("STRIPE_SECRET_KEY" "OPENAI_API_KEY" "MONGODB_URI" "CLOUDFLARE_API_TOKEN" "CLOUDFLARE_ZONE_ID")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    printf '%s\n' "${missing_vars[@]}"
    echo ""
    echo "Please set these variables in your .env file or environment:"
    echo "  STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key"
    echo "  OPENAI_API_KEY=sk-your_openai_api_key"  
    echo "  MONGODB_URI=your_mongodb_connection_string"
    echo "  CLOUDFLARE_API_TOKEN=your_cloudflare_api_token"
    echo "  CLOUDFLARE_ZONE_ID=94ad1fffaa41132c2ff517ce46f76692"
    exit 1
fi

echo -e "${GREEN}✅ All required environment variables are set${NC}"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

# Deploy to Cloudflare Workers
echo "☁️  Deploying to Cloudflare..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "📥 Installing Wrangler CLI..."
    npm install -g wrangler
fi

# Login check
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please login to Cloudflare:"
    wrangler login
fi

# Deploy to production
echo "🚀 Deploying to Cloudflare Workers..."
wrangler publish --env production
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment to Cloudflare successful${NC}"
else
    echo -e "${RED}❌ Cloudflare deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 FWEA-I deployment completed successfully!${NC}"
echo ""
echo "🌐 Your FWEA-I backend is now live at:"
echo "   API: https://api.fwea-i.com"
echo "   Health: https://api.fwea-i.com/api/health"
echo ""
echo "🎵 FWEA-I is ready to clean audio worldwide!"
