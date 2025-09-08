#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 FWEA-I Setup Script - Professional Audio Processing Platform');
console.log('📊 Supporting 197 languages worldwide\n');

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
    console.log('✅ .env file created with secure generated secrets\n');
} else {
    console.log('✅ .env file already exists\n');
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

console.log('\n🔧 Setup checklist:');
console.log('   1. ✅ Project structure created');
console.log('   2. ✅ Environment configuration ready');
console.log('   3. ✅ Upload directories created');
console.log('   4. ⚠️  Configure your API keys in .env');
console.log('   5. ⚠️  Set up MongoDB connection');
console.log('   6. ⚠️  Configure Stripe keys');
console.log('   7. ⚠️  Add OpenAI API key for language detection');

console.log('\n📚 Next steps:');
console.log('   npm install          # Install dependencies');
console.log('   npm run migrate       # Set up database');
console.log('   npm run dev          # Start development server');
console.log('   npm run deploy       # Deploy to production');

console.log('\n🎵 FWEA-I setup complete! Ready to clean audio in 197 languages!');
