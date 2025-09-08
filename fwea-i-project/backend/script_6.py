# Create database model files
model_files = {}

# User Model
model_files['backend/models/User.js'] = '''const mongoose = require('mongoose');
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
''';

# AudioFile Model
model_files['backend/models/AudioFile.js'] = '''const mongoose = require('mongoose');
const path = require('path');

const audioFileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Allow anonymous uploads
        index: true
    },
    originalName: {
        type: String,
        required: true,
        trim: true
    },
    filename: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    fileSize: {
        type: Number,
        required: true,
        min: 0
    },
    mimeType: {
        type: String,
        required: true
    },
    duration: {
        type: Number, // in seconds
        min: 0
    },
    format: String,
    bitrate: Number,
    sampleRate: Number,
    channels: Number,
    
    // File paths
    originalPath: {
        type: String,
        required: true
    },
    processedPath: String,
    previewPath: String,
    waveformPath: String,
    
    // Processing status
    status: {
        type: String,
        enum: ['uploaded', 'analyzing', 'processing', 'completed', 'failed'],
        default: 'uploaded',
        index: true
    },
    
    // Analysis results
    audioAnalysis: {
        peaks: [Number],
        rms: {
            type: Number,
            min: 0,
            max: 1
        },
        dynamicRange: Number,
        loudness: Number,
        silenceDetected: Boolean,
        clipDetected: Boolean
    },
    
    detectedLanguages: [{
        language: {
            type: String,
            required: true
        },
        confidence: {
            type: Number,
            min: 0,
            max: 1,
            required: true
        },
        segments: [{
            start: {
                type: Number,
                required: true,
                min: 0
            },
            end: {
                type: Number,
                required: true,
                min: 0
            },
            text: String,
            confidence: {
                type: Number,
                min: 0,
                max: 1
            }
        }]
    }],
    
    profanityAnalysis: {
        found: {
            type: Boolean,
            default: false,
            index: true
        },
        count: {
            type: Number,
            default: 0,
            min: 0
        },
        severity: {
            type: String,
            enum: ['none', 'mild', 'moderate', 'severe'],
            default: 'none',
            index: true
        },
        timestamps: [{
            start: {
                type: Number,
                required: true,
                min: 0
            },
            end: {
                type: Number,
                required: true,
                min: 0
            },
            word: String,
            confidence: {
                type: Number,
                min: 0,
                max: 1
            },
            language: String,
            severity: {
                type: String,
                enum: ['mild', 'moderate', 'severe']
            }
        }],
        languageSpecific: [{
            language: String,
            count: Number,
            words: [String]
        }]
    },
    
    // Waveform data
    waveformData: {
        data: [mongoose.Schema.Types.Mixed],
        width: {
            type: Number,
            min: 1
        },
        height: {
            type: Number,
            min: 1
        },
        samples: {
            type: Number,
            min: 1
        },
        peaks: [mongoose.Schema.Types.Mixed],
        rms: Number
    },
    
    // Processing metadata
    processingTime: {
        type: Number, // in milliseconds
        min: 0
    },
    processedAt: Date,
    processingStages: [{
        stage: String,
        startTime: Date,
        endTime: Date,
        duration: Number,
        status: {
            type: String,
            enum: ['started', 'completed', 'failed']
        },
        error: String
    }],
    
    // Quality metrics
    qualityMetrics: {
        inputQuality: {
            type: String,
            enum: ['low', 'medium', 'high', 'premium']
        },
        outputQuality: {
            type: String,
            enum: ['low', 'medium', 'high', 'premium']
        },
        compressionRatio: Number,
        noiseReduction: Number,
        clarityImprovement: Number
    },
    
    // Access control
    isPublic: {
        type: Boolean,
        default: false,
        index: true
    },
    accessLevel: {
        type: String,
        enum: ['private', 'unlisted', 'public'],
        default: 'private'
    },
    
    // Sharing and collaboration
    shareToken: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    sharedAt: Date,
    shareExpires: Date,
    downloadCount: {
        type: Number,
        default: 0,
        min: 0
    },
    viewCount: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // Metadata and tags
    tags: [String],
    description: String,
    category: {
        type: String,
        enum: ['music', 'podcast', 'voice', 'interview', 'lecture', 'other'],
        default: 'other'
    },
    
    // Payment and licensing
    isPaid: {
        type: Boolean,
        default: false,
        index: true
    },
    paymentId: String,
    licenseType: {
        type: String,
        enum: ['personal', 'commercial', 'broadcast', 'unlimited'],
        default: 'personal'
    },
    
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        index: { expireAfterSeconds: 0 }
    }
});

// Compound indexes for better performance
audioFileSchema.index({ userId: 1, createdAt: -1 });
audioFileSchema.index({ status: 1, createdAt: -1 });
audioFileSchema.index({ 'profanityAnalysis.found': 1, 'profanityAnalysis.severity': 1 });
audioFileSchema.index({ shareToken: 1, shareExpires: 1 });

// Update the updatedAt field on save
audioFileSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for file URL
audioFileSchema.virtual('fileUrl').get(function() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/uploads/${this.filename}`;
});

// Create share token
audioFileSchema.methods.createShareToken = function(expirationHours = 24) {
    const crypto = require('crypto');
    this.shareToken = crypto.randomBytes(32).toString('hex');
    this.sharedAt = new Date();
    this.shareExpires = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
    return this.save();
};

// Get file URL based on type
audioFileSchema.methods.getFileUrl = function(type = 'original') {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    switch (type) {
        case 'processed':
            return this.processedPath ? `${baseUrl}/uploads/${path.basename(this.processedPath)}` : null;
        case 'preview':
            return this.previewPath ? `${baseUrl}/uploads/previews/${path.basename(this.previewPath)}` : null;
        case 'waveform':
            return this.waveformPath ? `${baseUrl}/uploads/waveforms/${path.basename(this.waveformPath)}` : null;
        default:
            return `${baseUrl}/uploads/${this.filename}`;
    }
};

// Check if file is expired
audioFileSchema.methods.isExpired = function() {
    return this.expiresAt && this.expiresAt < new Date();
};

// Increment view count
audioFileSchema.methods.incrementViewCount = function() {
    this.viewCount += 1;
    return this.save();
};

// Increment download count
audioFileSchema.methods.incrementDownloadCount = function() {
    this.downloadCount += 1;
    return this.save();
};

// Add processing stage
audioFileSchema.methods.addProcessingStage = function(stage, status = 'started') {
    const stageData = {
        stage,
        startTime: new Date(),
        status
    };
    
    this.processingStages.push(stageData);
    return this.save();
};

// Complete processing stage
audioFileSchema.methods.completeProcessingStage = function(stage, error = null) {
    const stageIndex = this.processingStages.findIndex(s => s.stage === stage && s.status === 'started');
    
    if (stageIndex !== -1) {
        this.processingStages[stageIndex].endTime = new Date();
        this.processingStages[stageIndex].duration = 
            this.processingStages[stageIndex].endTime - this.processingStages[stageIndex].startTime;
        this.processingStages[stageIndex].status = error ? 'failed' : 'completed';
        if (error) {
            this.processingStages[stageIndex].error = error;
        }
    }
    
    return this.save();
};

// Static methods for statistics and queries
audioFileSchema.statics.getProcessingStats = async function() {
    return this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgProcessingTime: { $avg: '$processingTime' },
                avgFileSize: { $avg: '$fileSize' }
            }
        }
    ]);
};

audioFileSchema.statics.getLanguageStats = async function() {
    return this.aggregate([
        { $unwind: '$detectedLanguages' },
        {
            $group: {
                _id: '$detectedLanguages.language',
                count: { $sum: 1 },
                avgConfidence: { $avg: '$detectedLanguages.confidence' }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

audioFileSchema.statics.getProfanityStats = async function() {
    return this.aggregate([
        {
            $group: {
                _id: '$profanityAnalysis.severity',
                count: { $sum: 1 },
                avgProfanityCount: { $avg: '$profanityAnalysis.count' }
            }
        }
    ]);
};

audioFileSchema.statics.findByShareToken = function(token) {
    return this.findOne({
        shareToken: token,
        $or: [
            { shareExpires: { $gt: new Date() } },
            { shareExpires: null }
        ]
    });
};

audioFileSchema.statics.cleanExpired = async function() {
    const expiredFiles = await this.find({
        $or: [
            { expiresAt: { $lt: new Date() } },
            { 
                shareExpires: { $lt: new Date() },
                shareToken: { $exists: true }
            }
        ]
    });
    
    // Delete physical files and database records
    const fs = require('fs');
    for (const file of expiredFiles) {
        try {
            if (file.originalPath && fs.existsSync(file.originalPath)) {
                fs.unlinkSync(file.originalPath);
            }
            if (file.processedPath && fs.existsSync(file.processedPath)) {
                fs.unlinkSync(file.processedPath);
            }
            if (file.previewPath && fs.existsSync(file.previewPath)) {
                fs.unlinkSync(file.previewPath);
            }
        } catch (error) {
            console.error(`Error deleting file ${file.filename}:`, error);
        }
    }
    
    return this.deleteMany({
        _id: { $in: expiredFiles.map(f => f._id) }
    });
};

module.exports = mongoose.model('AudioFile', audioFileSchema);
''';

# ProcessingJob Model
model_files['backend/models/ProcessingJob.js'] = '''const mongoose = require('mongoose');

const processingJobSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Allow anonymous processing
        index: true
    },
    audioFileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AudioFile',
        index: true
    },
    
    // Job identification
    jobId: {
        type: String,
        unique: true,
        default: function() {
            return require('uuid').v4();
        }
    },
    
    // File information
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true,
        min: 0
    },
    mimeType: String,
    
    // Processing status and progress
    status: {
        type: String,
        enum: [
            'uploaded', 'analyzing', 'language-detection', 'content-scanning', 
            'processing', 'preview', 'completed', 'failed', 'cancelled'
        ],
        default: 'uploaded',
        index: true
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    currentStage: {
        type: String,
        default: 'uploaded'
    },
    stageDescription: String,
    
    // Processing stages tracking with detailed timing
    stages: [{
        name: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed', 'skipped'],
            default: 'pending'
        },
        startTime: Date,
        endTime: Date,
        duration: Number, // in milliseconds
        progress: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        description: String,
        error: String,
        retryCount: {
            type: Number,
            default: 0
        },
        metadata: mongoose.Schema.Types.Mixed
    }],
    
    // Processing results
    detectedLanguages: [{
        language: String,
        confidence: Number,
        segments: [{
            start: Number,
            end: Number,
            text: String,
            confidence: Number
        }]
    }],
    
    profanityResults: {
        found: {
            type: Boolean,
            default: false
        },
        count: {
            type: Number,
            default: 0
        },
        severity: {
            type: String,
            enum: ['none', 'mild', 'moderate', 'severe'],
            default: 'none'
        },
        timestamps: [{
            start: Number,
            end: Number,
            word: String,
            confidence: Number,
            language: String,
            category: String
        }],
        languageBreakdown: [{
            language: String,
            count: Number,
            severity: String
        }]
    },
    
    // Audio analysis results
    audioAnalysis: {
        duration: Number,
        sampleRate: Number,
        bitrate: Number,
        channels: Number,
        format: String,
        quality: String,
        loudness: Number,
        dynamicRange: Number,
        peakLevels: [Number],
        rmsLevels: [Number]
    },
    
    waveformData: {
        data: [mongoose.Schema.Types.Mixed],
        width: Number,
        height: Number,
        samples: Number,
        peaks: [mongoose.Schema.Types.Mixed],
        generatedAt: Date
    },
    
    // File paths and URLs
    originalPath: String,
    outputPath: String,
    previewPath: String,
    previewUrl: String,
    waveformImagePath: String,
    
    // Processing performance metrics
    processingStartTime: Date,
    processingEndTime: Date,
    totalProcessingTime: Number, // in milliseconds
    estimatedTimeRemaining: Number, // in seconds
    processingSpeed: Number, // files per minute
    cpuUsage: Number,
    memoryUsage: Number,
    
    // Quality and optimization settings
    processingSettings: {
        quality: {
            type: String,
            enum: ['draft', 'standard', 'high', 'premium'],
            default: 'standard'
        },
        preserveOriginalQuality: {
            type: Boolean,
            default: true
        },
        outputFormat: {
            type: String,
            enum: ['mp3', 'wav', 'flac', 'm4a', 'aac'],
            default: 'mp3'
        },
        bitrate: String,
        sampleRate: Number,
        channels: Number,
        customSettings: mongoose.Schema.Types.Mixed
    },
    
    // Payment and licensing information
    isPaid: {
        type: Boolean,
        default: false,
        index: true
    },
    paymentId: String,
    subscriptionId: String,
    priceId: String,
    paymentAmount: Number,
    paymentCurrency: {
        type: String,
        default: 'usd'
    },
    paymentFailed: {
        type: Boolean,
        default: false
    },
    paymentError: String,
    paidAt: Date,
    
    // Preview and access control
    previewAccessed: {
        type: Boolean,
        default: false
    },
    previewAccessTime: Date,
    previewCount: {
        type: Number,
        default: 0
    },
    previewDuration: {
        type: Number,
        default: 30 // seconds
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    
    // Error handling and debugging
    error: String,
    errorDetails: {
        message: String,
        stack: String,
        code: String,
        stage: String,
        timestamp: Date
    },
    warnings: [String],
    debugInfo: mongoose.Schema.Types.Mixed,
    
    // Retry and recovery
    retryCount: {
        type: Number,
        default: 0
    },
    maxRetries: {
        type: Number,
        default: 3
    },
    retryDelay: {
        type: Number,
        default: 5000 // milliseconds
    },
    
    // Priority and scheduling
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal',
        index: true
    },
    scheduledFor: Date,
    assignedWorker: String,
    processingNode: String,
    
    // Expiration and cleanup
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        index: { expireAfterSeconds: 0 }
    },
    keepUntil: Date,
    autoDelete: {
        type: Boolean,
        default: true
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    completedAt: Date
});

// Compound indexes for better query performance
processingJobSchema.index({ userId: 1, createdAt: -1 });
processingJobSchema.index({ status: 1, priority: -1, createdAt: 1 });
processingJobSchema.index({ isPaid: 1, status: 1 });
processingJobSchema.index({ createdAt: 1, expiresAt: 1 });
processingJobSchema.index({ paymentId: 1 }, { sparse: true });
processingJobSchema.index({ subscriptionId: 1 }, { sparse: true });

// Update timestamps on save
processingJobSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    this.lastUpdated = Date.now();
    next();
});

// Virtual for processing duration
processingJobSchema.virtual('processingDuration').get(function() {
    if (this.processingStartTime && this.processingEndTime) {
        return this.processingEndTime - this.processingStartTime;
    }
    return null;
});

// Start processing stage
processingJobSchema.methods.startStage = function(stageName, description) {
    const stage = {
        name: stageName,
        status: 'processing',
        startTime: new Date(),
        description: description || '',
        progress: 0
    };
    
    this.stages.push(stage);
    this.currentStage = stageName;
    this.stageDescription = description;
    
    // Set processing start time if this is the first stage
    if (!this.processingStartTime) {
        this.processingStartTime = new Date();
    }
    
    return this.save();
};

// Update stage progress
processingJobSchema.methods.updateStageProgress = function(stageName, progress, description) {
    const stage = this.stages.find(s => s.name === stageName && s.status === 'processing');
    
    if (stage) {
        stage.progress = Math.min(Math.max(progress, 0), 100);
        if (description) {
            stage.description = description;
        }
    }
    
    // Update overall progress based on stage weights
    const stageWeights = {
        'uploaded': 5,
        'analyzing': 15,
        'language-detection': 25,
        'content-scanning': 30,
        'processing': 20,
        'preview': 5
    };
    
    let totalWeight = 0;
    let completedWeight = 0;
    
    for (const s of this.stages) {
        const weight = stageWeights[s.name] || 10;
        totalWeight += weight;
        
        if (s.status === 'completed') {
            completedWeight += weight;
        } else if (s.status === 'processing') {
            completedWeight += (weight * s.progress / 100);
        }
    }
    
    this.progress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
    this.stageDescription = description;
    
    return this.save();
};

// Complete processing stage
processingJobSchema.methods.completeStage = function(stageName, metadata = null) {
    const stage = this.stages.find(s => s.name === stageName && s.status === 'processing');
    
    if (stage) {
        stage.status = 'completed';
        stage.endTime = new Date();
        stage.duration = stage.endTime - stage.startTime;
        stage.progress = 100;
        if (metadata) {
            stage.metadata = metadata;
        }
    }
    
    return this.save();
};

// Fail processing stage
processingJobSchema.methods.failStage = function(stageName, error, retryable = false) {
    const stage = this.stages.find(s => s.name === stageName && s.status === 'processing');
    
    if (stage) {
        stage.status = 'failed';
        stage.endTime = new Date();
        stage.duration = stage.endTime - stage.startTime;
        stage.error = error;
        
        if (retryable && stage.retryCount < 3) {
            stage.retryCount += 1;
            stage.status = 'pending';
        }
    }
    
    if (!retryable || (stage && stage.retryCount >= 3)) {
        this.status = 'failed';
        this.error = error;
        this.errorDetails = {
            message: error,
            stage: stageName,
            timestamp: new Date()
        };
    }
    
    return this.save();
};

// Update progress with estimated time
processingJobSchema.methods.updateProgress = function(progress, description, estimatedTime) {
    this.progress = Math.min(Math.max(progress, 0), 100);
    if (description) this.stageDescription = description;
    if (estimatedTime) this.estimatedTimeRemaining = estimatedTime;
    
    return this.save();
};

// Check if job can be retried
processingJobSchema.methods.canRetry = function() {
    return this.status === 'failed' && this.retryCount < this.maxRetries;
};

// Retry processing
processingJobSchema.methods.retry = function() {
    if (!this.canRetry()) {
        throw new Error('Job cannot be retried');
    }
    
    this.retryCount += 1;
    this.status = 'uploaded';
    this.progress = 0;
    this.error = null;
    this.errorDetails = null;
    this.stages = [];
    this.processingStartTime = null;
    this.processingEndTime = null;
    
    return this.save();
};

// Complete the entire job
processingJobSchema.methods.complete = function(outputPath, previewPath = null) {
    this.status = 'completed';
    this.progress = 100;
    this.processingEndTime = new Date();
    this.totalProcessingTime = this.processingEndTime - this.processingStartTime;
    this.completedAt = new Date();
    this.outputPath = outputPath;
    
    if (previewPath) {
        this.previewPath = previewPath;
        this.previewUrl = `/uploads/previews/${require('path').basename(previewPath)}`;
    }
    
    return this.save();
};

// Mark job as failed
processingJobSchema.methods.fail = function(error, errorDetails = null) {
    this.status = 'failed';
    this.error = error;
    this.processingEndTime = new Date();
    
    if (this.processingStartTime) {
        this.totalProcessingTime = this.processingEndTime - this.processingStartTime;
    }
    
    if (errorDetails) {
        this.errorDetails = {
            ...errorDetails,
            timestamp: new Date()
        };
    }
    
    return this.save();
};

// Get processing duration
processingJobSchema.methods.getProcessingDuration = function() {
    if (this.processingStartTime && this.processingEndTime) {
        return this.processingEndTime - this.processingStartTime;
    }
    if (this.processingStartTime) {
        return Date.now() - this.processingStartTime;
    }
    return null;
};

// Check if preview is available
processingJobSchema.methods.isPreviewAvailable = function() {
    return this.status === 'completed' && (this.previewPath || this.previewUrl);
};

// Check if download is available (paid content)
processingJobSchema.methods.isDownloadAvailable = function() {
    return this.status === 'completed' && this.isPaid && this.outputPath;
};

// Access preview (with counting)
processingJobSchema.methods.accessPreview = function() {
    this.previewAccessed = true;
    this.previewAccessTime = new Date();
    this.previewCount += 1;
    return this.save();
};

// Record download
processingJobSchema.methods.recordDownload = function() {
    this.downloadCount += 1;
    return this.save();
};

// Static methods for analytics and management
processingJobSchema.statics.getJobStats = async function(timeframe = '24h') {
    const timeframeMappings = {
        '1h': 1 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const since = new Date(Date.now() - (timeframeMappings[timeframe] || timeframeMappings['24h']));
    
    return this.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgProcessingTime: { $avg: '$totalProcessingTime' },
                totalFileSize: { $sum: '$fileSize' }
            }
        }
    ]);
};

processingJobSchema.statics.getPerformanceMetrics = async function(timeframe = '24h') {
    const timeframeMappings = {
        '1h': 1 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const since = new Date(Date.now() - (timeframeMappings[timeframe] || timeframeMappings['24h']));
    
    return this.aggregate([
        { $match: { createdAt: { $gte: since }, status: 'completed' } },
        {
            $group: {
                _id: null,
                avgProcessingTime: { $avg: '$totalProcessingTime' },
                minProcessingTime: { $min: '$totalProcessingTime' },
                maxProcessingTime: { $max: '$totalProcessingTime' },
                totalJobs: { $sum: 1 },
                avgFileSize: { $avg: '$fileSize' },
                successRate: { $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
            }
        }
    ]);
};

processingJobSchema.statics.getPendingJobs = function(limit = 10) {
    return this.find({
        status: { $in: ['uploaded', 'analyzing', 'language-detection', 'content-scanning', 'processing'] },
        scheduledFor: { $lte: new Date() }
    })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit);
};

processingJobSchema.statics.cleanExpiredJobs = async function() {
    const expiredJobs = await this.find({
        $or: [
            { expiresAt: { $lt: new Date() } },
            { status: 'completed', completedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
        ]
    });
    
    // Delete associated files
    const fs = require('fs');
    for (const job of expiredJobs) {
        try {
            if (job.originalPath && fs.existsSync(job.originalPath)) {
                fs.unlinkSync(job.originalPath);
            }
            if (job.outputPath && fs.existsSync(job.outputPath)) {
                fs.unlinkSync(job.outputPath);
            }
            if (job.previewPath && fs.existsSync(job.previewPath)) {
                fs.unlinkSync(job.previewPath);
            }
        } catch (error) {
            console.error(`Error deleting files for job ${job._id}:`, error);
        }
    }
    
    return this.deleteMany({
        _id: { $in: expiredJobs.map(j => j._id) }
    });
};

module.exports = mongoose.model('ProcessingJob', processingJobSchema);
''';

# Write all model files
for filepath, content in model_files.items():
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ Created {filepath}")

print(f"\n🗄️  Created {len(model_files)} database model files")