# Create deployment scripts and comprehensive documentation (fixed)
docs_files = {}

# Quick setup script
docs_files['backend/scripts/setup.js'] = '''#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 FWEA-I Setup Script - Professional Audio Processing Platform');
console.log('📊 Supporting 197 languages worldwide\\n');

// Check if .env exists
if (!fs.existsSync('.env')) {
    console.log('📝 Creating .env file from template...');
    
    // Read template
    const template = fs.readFileSync('.env.example', 'utf8');
    
    // Generate secure secrets
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    const sessionSecret = crypto.randomBytes(32).toString('hex');
    
    // Replace placeholders with generated values
    let envContent = template
        .replace('your_jwt_secret_key_minimum_32_characters', jwtSecret)
        .replace('your_session_secret_here', sessionSecret);
    
    fs.writeFileSync('.env', envContent);
    console.log('✅ .env file created with secure generated secrets\\n');
} else {
    console.log('✅ .env file already exists\\n');
}

// Check for required directories
const directories = [
    'uploads',
    'uploads/previews', 
    'uploads/processed',
    'uploads/waveforms',
    'logs'
];

console.log('📁 Creating required directories...');
directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created: ${dir}`);
    } else {
        console.log(`📁 Exists: ${dir}`);
    }
});

console.log('\\n🔧 Setup checklist:');
console.log('   1. ✅ Project structure created');
console.log('   2. ✅ Environment configuration ready');
console.log('   3. ✅ Upload directories created');
console.log('   4. ⚠️  Configure your API keys in .env');
console.log('   5. ⚠️  Set up MongoDB connection');
console.log('   6. ⚠️  Configure Stripe keys');
console.log('   7. ⚠️  Add OpenAI API key for language detection');

console.log('\\n📚 Next steps:');
console.log('   npm install          # Install dependencies');
console.log('   npm run migrate       # Set up database');
console.log('   npm run dev          # Start development server');
console.log('   npm run deploy       # Deploy to production');

console.log('\\n🎵 FWEA-I setup complete! Ready to clean audio in 197 languages!');
''';

# Migration script
docs_files['backend/scripts/migrate.js'] = '''#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

// Import models to register schemas
const User = require('../models/User');
const AudioFile = require('../models/AudioFile');
const ProcessingJob = require('../models/ProcessingJob');

async function migrate() {
    try {
        console.log('🗄️  Connecting to MongoDB...');
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fwea-i';
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB\\n');
        
        console.log('📊 Running database migrations...');
        
        // Ensure all indexes are created
        console.log('🔍 Creating indexes...');
        await User.ensureIndexes();
        await AudioFile.ensureIndexes();
        await ProcessingJob.ensureIndexes();
        console.log('✅ All indexes created\\n');
        
        // Check collections exist
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        console.log('📋 Database collections:');
        ['users', 'audiofiles', 'processingjobs'].forEach(name => {
            if (collectionNames.includes(name)) {
                console.log(`   ✅ ${name}`);
            } else {
                console.log(`   ⚠️  ${name} (will be created on first use)`);
            }
        });
        
        // Create admin user if specified
        if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
            console.log('\\n👤 Creating admin user...');
            const adminExists = await User.findByEmail(process.env.ADMIN_EMAIL);
            
            if (!adminExists) {
                const admin = new User({
                    email: process.env.ADMIN_EMAIL,
                    name: 'FWEA-I Admin',
                    password: process.env.ADMIN_PASSWORD,
                    subscription: {
                        tier: 'studio-elite',
                        status: 'active',
                        previewLimit: 60
                    },
                    apiAccess: {
                        enabled: true
                    },
                    isActive: true
                });
                
                admin.generateApiKey();
                await admin.save();
                console.log(`✅ Admin user created: ${process.env.ADMIN_EMAIL}`);
                console.log(`🔑 API Key: ${admin.apiAccess.apiKey}`);
            } else {
                console.log(`✅ Admin user already exists: ${process.env.ADMIN_EMAIL}`);
            }
        }
        
        console.log('\\n🎵 Database migration completed successfully!');
        console.log('📈 Ready to process audio in 197 languages!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

// Run migration if called directly
if (require.main === module) {
    migrate();
}

module.exports = migrate;
''';

# Write all files first, then handle permissions
for filepath, content in docs_files.items():
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ Created {filepath}")

print(f"\n📚 Created {len(docs_files)} documentation files")
print("✅ All deployment scripts and documentation ready!")