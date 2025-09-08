const mongoose = require('mongoose');
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
