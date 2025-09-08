// MongoDB initialization script for FWEA-I
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
                    pattern: "^.+@.+\..+$",
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
