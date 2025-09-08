const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: function() {
            return !this.googleId && !this.socialLogin;
        }
    },
    googleId: {
        type: String,
        sparse: true
    },
    socialLogin: {
        type: Boolean,
        default: false
    },
    subscription: {
        tier: {
            type: String,
            enum: ['single', 'dj-pro', 'studio-elite', 'day-pass'],
            default: 'single'
        },
        stripeCustomerId: {
            type: String,
            sparse: true
        },
        subscriptionId: {
            type: String,
            sparse: true
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'cancelled', 'past_due', 'trialing'],
            default: 'inactive'
        },
        currentPeriodStart: Date,
        currentPeriodEnd: Date,
        previewLimit: {
            type: Number,
            default: 30 // seconds
        }
    },
    usage: {
        tracksProcessed: {
            type: Number,
            default: 0,
            min: 0
        },
        lastProcessingDate: Date,
        monthlyUsage: {
            type: Number,
            default: 0,
            min: 0
        },
        dailyUsage: {
            type: Number,
            default: 0,
            min: 0
        },
        lastResetDate: {
            type: Date,
            default: Date.now
        }
    },
    preferences: {
        language: {
            type: String,
            default: 'en',
            enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi']
        },
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            processing: {
                type: Boolean,
                default: true
            },
            marketing: {
                type: Boolean,
                default: false
            }
        },
        defaultQuality: {
            type: String,
            enum: ['standard', 'high', 'premium'],
            default: 'standard'
        },
        autoDownload: {
            type: Boolean,
            default: false
        }
    },
    apiAccess: {
        enabled: {
            type: Boolean,
            default: false
        },
        apiKey: {
            type: String,
            unique: true,
            sparse: true
        },
        rateLimit: {
            type: Number,
            default: 100 // requests per hour
        },
        lastApiCall: Date
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastLogin: {
        type: Date,
        index: true
    },
    loginCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for better performance
userSchema.index({ 'subscription.stripeCustomerId': 1 });
userSchema.index({ 'subscription.status': 1 });
userSchema.index({ 'apiAccess.apiKey': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Update the updatedAt field on save
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    try {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const salt = await bcrypt.genSalt(saltRounds);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

// Get preview limit based on subscription
userSchema.methods.getPreviewLimit = function() {
    const limits = {
        'single': 30,
        'dj-pro': 45,
        'studio-elite': 60,
        'day-pass': 30
    };

    return limits[this.subscription.tier] || 30;
};

// Check if user can process more files
userSchema.methods.canProcessFile = function() {
    const limits = {
        'single': 1,
        'dj-pro': -1, // unlimited
        'studio-elite': -1, // unlimited
        'day-pass': -1 // unlimited for 24 hours
    };

    const limit = limits[this.subscription.tier];
    if (limit === -1) return true; // unlimited

    // Check daily usage reset
    const today = new Date().toDateString();
    const lastReset = new Date(this.usage.lastResetDate).toDateString();

    if (today !== lastReset) {
        this.usage.dailyUsage = 0;
        this.usage.lastResetDate = new Date();
    }

    return this.usage.dailyUsage < limit;
};

// Update usage statistics
userSchema.methods.incrementUsage = function() {
    this.usage.tracksProcessed += 1;
    this.usage.dailyUsage += 1;
    this.usage.monthlyUsage += 1;
    this.usage.lastProcessingDate = new Date();
    return this.save();
};

// Generate API key
userSchema.methods.generateApiKey = function() {
    const crypto = require('crypto');
    this.apiAccess.apiKey = 'fwea_' + crypto.randomBytes(32).toString('hex');
    this.apiAccess.enabled = true;
    return this.apiAccess.apiKey;
};

// Check API rate limit
userSchema.methods.checkRateLimit = function() {
    if (!this.apiAccess.enabled) return false;

    const now = new Date();
    const hourAgo = new Date(now - 60 * 60 * 1000);

    if (!this.apiAccess.lastApiCall || this.apiAccess.lastApiCall < hourAgo) {
        this.apiAccess.lastApiCall = now;
        return true;
    }

    // This would need more sophisticated rate limiting in production
    return true;
};

// Static methods for user management
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByApiKey = function(apiKey) {
    return this.findOne({ 'apiAccess.apiKey': apiKey, 'apiAccess.enabled': true });
};

// Get subscription statistics
userSchema.statics.getSubscriptionStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: '$subscription.tier',
                count: { $sum: 1 },
                activeCount: {
                    $sum: {
                        $cond: [{ $eq: ['$subscription.status', 'active'] }, 1, 0]
                    }
                }
            }
        }
    ]);
};

module.exports = mongoose.model('User', userSchema);
