# Create configuration files and deployment scripts
config_files = {}

# Environment variables template
config_files['backend/.env.example'] = '''# FWEA-I Omnilingual Clean Version Editor - Environment Configuration
# Copy this file to .env and fill in your actual values

# Application Configuration
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:8080

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/fwea-i

# OpenAI Configuration (for Whisper API - language detection)
OPENAI_API_KEY=sk-your_openai_api_key_here

# Stripe Configuration (Payment Processing)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Security Configuration
JWT_SECRET=your_jwt_secret_key_minimum_32_characters
BCRYPT_ROUNDS=12

# File Upload Configuration
MAX_FILE_SIZE=104857600
UPLOAD_PATH=./uploads

# Redis Configuration (Optional - for caching and rate limiting)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Cloudflare Configuration
CLOUDFLARE_ZONE_ID=94ad1fffaa41132c2ff517ce46f76692
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id

# Email Configuration (Optional - for notifications)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@fwea-i.com
SUPPORT_EMAIL=support@fwea-i.com

# Monitoring and Analytics (Optional)
SENTRY_DSN=your_sentry_dsn
GOOGLE_ANALYTICS_ID=your_ga_id

# API Configuration
API_RATE_LIMIT=100
API_BURST_LIMIT=10

# Processing Configuration
MAX_CONCURRENT_JOBS=5
JOB_TIMEOUT=300000
CLEANUP_INTERVAL=3600000

# Development Configuration
DEBUG=true
LOG_LEVEL=info
ENABLE_CORS=true
''';

# Cloudflare Workers configuration
config_files['backend/wrangler.toml'] = '''# Cloudflare Workers configuration for FWEA-I Backend
name = "fwea-i-backend"
main = "server.js"
compatibility_date = "2023-10-01"
node_compat = true

[env.production]
name = "fwea-i-production"
zone_id = "94ad1fffaa41132c2ff517ce46f76692"

[env.staging]
name = "fwea-i-staging"
zone_id = "94ad1fffaa41132c2ff517ce46f76692"

# Environment variables (set these via wrangler secret put)
[vars]
NODE_ENV = "production"
BASE_URL = "https://api.fwea-i.com"
FRONTEND_URL = "https://www.fwea-i.com"
MAX_FILE_SIZE = "104857600"
API_RATE_LIMIT = "100"

# KV namespaces for caching
[[kv_namespaces]]
binding = "CACHE"
id = "fwea-i-cache"
preview_id = "fwea-i-cache-preview"

# R2 bucket for file storage
[[r2_buckets]]
binding = "AUDIO_STORAGE"
bucket_name = "fwea-i-audio-files"
preview_bucket_name = "fwea-i-audio-files-preview"

# Durable Objects for processing coordination
[[durable_objects.bindings]]
name = "PROCESSING_COORDINATOR"
class_name = "ProcessingCoordinator"

# Custom domains
[[routes]]
pattern = "api.fwea-i.com/*"
zone_id = "94ad1fffaa41132c2ff517ce46f76692"

# Build configuration
[build]
command = "npm run build"

# Deployment configuration
[miniflare]
kv_persist = true
r2_persist = true
''';

# Docker configuration for local development
config_files['docker-compose.yml'] = '''version: '3.8'

services:
  # MongoDB Database
  mongodb:
    image: mongo:6.0
    container_name: fwea-i-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: fwea-i-secure-password
      MONGO_INITDB_DATABASE: fwea-i
    volumes:
      - mongodb_data:/data/db
      - ./config/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    networks:
      - fwea-i-network

  # Redis for caching and rate limiting
  redis:
    image: redis:7-alpine
    container_name: fwea-i-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --requirepass fwea-i-redis-password
    volumes:
      - redis_data:/data
    networks:
      - fwea-i-network

  # FWEA-I Backend Application
  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    container_name: fwea-i-backend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
      - MONGODB_URI=mongodb://admin:fwea-i-secure-password@mongodb:27017/fwea-i?authSource=admin
      - REDIS_URL=redis://:fwea-i-redis-password@redis:6379
      - BASE_URL=http://localhost:3000
      - FRONTEND_URL=http://localhost:8080
    volumes:
      - ./backend:/app
      - ./backend/uploads:/app/uploads
      - ./backend/logs:/app/logs
      - /app/node_modules
    depends_on:
      - mongodb
      - redis
    networks:
      - fwea-i-network
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Nginx Reverse Proxy (Production)
  nginx:
    image: nginx:alpine
    container_name: fwea-i-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./config/ssl:/etc/nginx/ssl:ro
      - ./backend/uploads:/var/www/uploads:ro
    depends_on:
      - backend
    networks:
      - fwea-i-network
    profiles:
      - production

volumes:
  mongodb_data:
    driver: local
  redis_data:
    driver: local

networks:
  fwea-i-network:
    driver: bridge
''';

# Backend Dockerfile
config_files['backend/Dockerfile'] = '''FROM node:18-alpine

# Install system dependencies for audio processing
RUN apk add --no-cache \\
    ffmpeg \\
    python3 \\
    make \\
    g++ \\
    cairo-dev \\
    jpeg-dev \\
    pango-dev \\
    musl-dev \\
    giflib-dev \\
    pixman-dev \\
    libjpeg-turbo-dev \\
    freetype-dev

# Set working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy application code
COPY --chown=nextjs:nodejs . .

# Create necessary directories
RUN mkdir -p uploads/previews uploads/processed uploads/waveforms logs
RUN chown -R nextjs:nodejs uploads logs
RUN chmod -R 755 uploads

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD node healthcheck.js || exit 1

# Start application
CMD ["node", "server.js"]
''';

# Health check script
config_files['backend/healthcheck.js'] = '''const http = require('http');

const options = {
    hostname: 'localhost',
    port: process.env.PORT || 3000,
    path: '/api/health',
    method: 'GET',
    timeout: 2000
};

const request = http.request(options, (res) => {
    let data = '';
    
    res.on('data', chunk => {
        data += chunk;
    });
    
    res.on('end', () => {
        if (res.statusCode === 200) {
            try {
                const health = JSON.parse(data);
                console.log(`✅ Health check passed: ${health.status}`);
                process.exit(0);
            } catch (error) {
                console.error('❌ Invalid health check response');
                process.exit(1);
            }
        } else {
            console.error(`❌ Health check failed with status: ${res.statusCode}`);
            process.exit(1);
        }
    });
});

request.on('error', (error) => {
    console.error('❌ Health check error:', error.message);
    process.exit(1);
});

request.on('timeout', () => {
    console.error('❌ Health check timeout');
    request.destroy();
    process.exit(1);
});

request.end();
''';

# MongoDB initialization script
config_files['config/mongo-init.js'] = '''// MongoDB initialization script for FWEA-I
print('🗄️  Initializing FWEA-I database...');

// Switch to FWEA-I database
db = db.getSiblingDB('fwea-i');

// Create collections with validation
db.createCollection('users', {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["email", "name"],
            properties: {
                email: {
                    bsonType: "string",
                    pattern: "^.+@.+\\..+$",
                    description: "Email must be a valid email address"
                },
                name: {
                    bsonType: "string",
                    minLength: 1,
                    description: "Name is required and cannot be empty"
                }
            }
        }
    }
});

db.createCollection('audiofiles');
db.createCollection('processingjobs');

// Create indexes for performance
print('📊 Creating database indexes...');

// User indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "subscription.stripeCustomerId": 1 }, { sparse: true });
db.users.createIndex({ "subscription.status": 1 });
db.users.createIndex({ "apiAccess.apiKey": 1 }, { sparse: true });
db.users.createIndex({ "createdAt": 1 });
db.users.createIndex({ "lastLogin": -1 });
db.users.createIndex({ "isActive": 1 });

// AudioFile indexes
db.audiofiles.createIndex({ "userId": 1, "createdAt": -1 });
db.audiofiles.createIndex({ "filename": 1 }, { unique: true });
db.audiofiles.createIndex({ "status": 1 });
db.audiofiles.createIndex({ "shareToken": 1 }, { sparse: true });
db.audiofiles.createIndex({ "isPaid": 1, "status": 1 });
db.audiofiles.createIndex({ "profanityAnalysis.found": 1, "profanityAnalysis.severity": 1 });
db.audiofiles.createIndex({ "createdAt": 1 });
db.audiofiles.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

// ProcessingJob indexes
db.processingjobs.createIndex({ "userId": 1, "createdAt": -1 });
db.processingjobs.createIndex({ "status": 1, "priority": -1, "createdAt": 1 });
db.processingjobs.createIndex({ "jobId": 1 }, { unique: true });
db.processingjobs.createIndex({ "isPaid": 1 });
db.processingjobs.createIndex({ "paymentId": 1 }, { sparse: true });
db.processingjobs.createIndex({ "subscriptionId": 1 }, { sparse: true });
db.processingjobs.createIndex({ "createdAt": 1, "expiresAt": 1 });
db.processingjobs.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

print('✅ Database initialization completed successfully!');
print('🎵 FWEA-I is ready to process audio in 197 languages!');
''';

# Write all configuration files
for filepath, content in config_files.items():
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ Created {filepath}")

print(f"\n⚙️ Created {len(config_files)} configuration files")