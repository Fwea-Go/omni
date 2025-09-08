#!/usr/bin/env node

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
        console.log('✅ Connected to MongoDB\n');

        console.log('📊 Running database migrations...');

        // Ensure all indexes are created
        console.log('🔍 Creating indexes...');
        await User.ensureIndexes();
        await AudioFile.ensureIndexes();
        await ProcessingJob.ensureIndexes();
        console.log('✅ All indexes created\n');

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
            console.log('\n👤 Creating admin user...');
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

        console.log('\n🎵 Database migration completed successfully!');
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
