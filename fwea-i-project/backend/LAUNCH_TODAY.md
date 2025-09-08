# 🚀 Launch FWEA-I Today - Complete Guide

> **Everything you need to deploy your 197-language audio cleaning platform in under 30 minutes**

## ⚡ Super Quick Launch (5 minutes)

### 1. Clone Repository
```bash
git clone https://github.com/Fwea-Go/omnicleanversion.git
cd omnicleanversion
```

### 2. Set Up Environment
```bash
# Run automatic setup
cd backend && npm run setup

# Edit .env file with your API keys
cp .env.example .env
```

**Required API Keys:**
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `OPENAI_API_KEY` - OpenAI API key for Whisper
- `MONGODB_URI` - MongoDB connection string
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token

### 3. Deploy to Cloudflare
```bash
npm install
npm run deploy
```

**Done!** Your FWEA-I platform is live at `https://api.fwea-i.com`

---

## 📋 Complete Launch Checklist

### ✅ Phase 1: Project Setup (5 min)

- [ ] Clone repository from GitHub
- [ ] Run `npm run setup` to create structure
- [ ] Copy `.env.example` to `.env`
- [ ] Install dependencies: `npm install`

### ✅ Phase 2: Service Configuration (10 min)

#### Stripe Setup
- [ ] Create Stripe account at https://stripe.com
- [ ] Get test keys from Stripe Dashboard
- [ ] Add `STRIPE_SECRET_KEY` to `.env`
- [ ] Configure webhook endpoint: `https://api.fwea-i.com/api/webhook/stripe`

#### OpenAI Setup  
- [ ] Create OpenAI account at https://openai.com
- [ ] Generate API key in API settings
- [ ] Add `OPENAI_API_KEY` to `.env`
- [ ] Verify Whisper API access

#### Database Setup
- [ ] Create MongoDB Atlas account (free tier)
- [ ] Create new cluster and database
- [ ] Get connection string
- [ ] Add `MONGODB_URI` to `.env`

#### Cloudflare Setup
- [ ] Sign up at https://cloudflare.com
- [ ] Go to your zone: `94ad1fffaa41132c2ff517ce46f76692`
- [ ] Create API token with Zone:Edit permissions
- [ ] Add `CLOUDFLARE_API_TOKEN` to `.env`

### ✅ Phase 3: Deployment (10 min)

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy backend
npm run deploy

# Test deployment
curl https://api.fwea-i.com/api/health
```

### ✅ Phase 4: Frontend Integration (5 min)

#### Update Wix Site
1. Go to your Wix editor
2. Update API endpoints to: `https://api.fwea-i.com`
3. Replace frontend files with new versions
4. Publish your Wix site

#### VSCode Integration
1. Open project in VSCode
2. Install recommended extensions
3. Use integrated terminal for commands
4. Commit changes to GitHub

---

## 🔧 Environment Variables Reference

```bash
# REQUIRED - Core Platform
NODE_ENV=production
PORT=3000
BASE_URL=https://api.fwea-i.com
FRONTEND_URL=https://www.fwea-i.com

# REQUIRED - Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/fwea-i

# REQUIRED - Payment Processing
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# REQUIRED - AI Language Detection
OPENAI_API_KEY=sk-your_openai_api_key

# REQUIRED - CDN & Hosting
CLOUDFLARE_ZONE_ID=94ad1fffaa41132c2ff517ce46f76692
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token

# REQUIRED - Security
JWT_SECRET=your_32_character_minimum_secret_key
BCRYPT_ROUNDS=12
```

---

## 🎯 Testing Your Deployment

### 1. Health Check
```bash
curl https://api.fwea-i.com/api/health
```
Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-09-07T19:00:00.000Z",
  "connectedUsers": 0
}
```

### 2. File Upload Test
```bash
# Upload a test audio file
curl -X POST https://api.fwea-i.com/api/upload \
  -F "audio=@test-audio.mp3"
```

### 3. Payment Test
Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

---

## 🆘 Troubleshooting

### Common Issues

#### "MongoDB connection failed"
```bash
# Check connection string format
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/database
```

#### "Stripe webhook failed"
```bash
# Update webhook URL in Stripe Dashboard
https://api.fwea-i.com/api/webhook/stripe
```

#### "OpenAI API error"
```bash
# Verify API key has Whisper access
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/audio/transcriptions
```

#### "Cloudflare deployment failed"
```bash
# Re-authenticate
wrangler logout
wrangler login
wrangler publish --env production
```

---

## 🎉 You're Live!

**Congratulations!** Your FWEA-I Omnilingual Clean Version Editor is now live and processing audio in 197 languages worldwide.

### What You've Built:
✅ Professional audio cleaning platform  
✅ 197-language AI processing engine  
✅ Real-time WebSocket updates  
✅ Secure Stripe payment integration  
✅ Scalable Cloudflare infrastructure  
✅ MongoDB data persistence  
✅ Complete frontend & backend  

**You've just launched the world's most comprehensive omnilingual audio cleaning platform! 🌍🎵**
