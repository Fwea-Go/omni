const mongoose = require('mongoose');

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
