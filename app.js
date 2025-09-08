// Enhanced FWEA-I Omnilingual Clean Version Editor - Main Application Logic

class FWEAAudioEditor {
    constructor() {
        this.currentFile = null;
        this.isProcessing = false;
        this.audioContext = null;
        this.previewAudio = null;
        this.previewDuration = 30; // Default 30 seconds for Single Track/Day Pass
        this.currentPreviewTime = 0;
        this.previewTimer = null;
        this.stripe = null;
        this.currentStep = 1;
        this.waveformZoom = 1;
        this.selectedTier = null;
        
        // Updated processing stages with more detail
        this.processingStages = [
            { name: "Uploading", description: "Securely uploading your audio file to our servers...", progress: 0, icon: "upload", estimatedTime: 30 },
            { name: "Analyzing", description: "Analyzing audio characteristics and metadata...", progress: 15, icon: "search", estimatedTime: 45 },
            { name: "Language Detection", description: "AI detecting spoken languages and dialects...", progress: 35, icon: "globe", estimatedTime: 60 },
            { name: "Content Scanning", description: "Scanning for inappropriate content patterns...", progress: 55, icon: "shield", estimatedTime: 90 },
            { name: "AI Processing", description: "Applying intelligent audio filtering...", progress: 75, icon: "cpu", estimatedTime: 45 },
            { name: "Quality Enhancement", description: "Optimizing audio quality and levels...", progress: 90, icon: "sparkles", estimatedTime: 30 },
            { name: "Complete", description: "Your clean audio is ready for preview!", progress: 100, icon: "check", estimatedTime: 0 }
        ];

        // Updated pricing tiers with correct preview lengths
        this.pricingTiers = [
            {
                name: "Single Track",
                price: "$4.99",
                priceId: "price_1S4NnmJ2Iq1764pCjA9xMnrn",
                type: "one-time",
                previewLength: 30,
                badge: "Most Affordable"
            },
            {
                name: "DJ Pro", 
                price: "$29.99/month",
                priceId: "price_1S4NpzJ2Iq1764pCcZISuhug",
                type: "subscription",
                previewLength: 60,
                badge: "Most Popular",
                popular: true
            },
            {
                name: "Studio Elite",
                price: "$99.99/month",
                priceId: "price_1S4Nr3J2Iq1764pCzHY4zIWr", 
                type: "subscription",
                previewLength: 60,
                badge: "Professional"
            },
            {
                name: "Studio Day Pass",
                price: "$9.99",
                priceId: "price_1S4NsTJ2Iq1764pCCbru0Aao",
                type: "one-time", 
                previewLength: 30,
                badge: "Limited Time"
            }
        ];

        // Supported languages for detection simulation
        this.supportedLanguages = [
            "English", "Spanish", "French", "German", "Chinese (Mandarin)", "Japanese", "Korean", 
            "Arabic", "Hindi", "Portuguese", "Russian", "Italian", "Dutch", "Swedish", "Norwegian",
            "Danish", "Finnish", "Polish", "Turkish", "Hebrew", "Thai", "Vietnamese", "Indonesian",
            "Malay", "Tagalog", "Swahili", "Urdu", "Bengali", "Tamil", "Telugu", "Marathi", "Gujarati",
            "Punjabi", "Malayalam", "Kannada", "Oriya", "Assamese", "Czech", "Slovak", "Hungarian", 
            "Romanian", "Bulgarian", "Croatian", "Serbian", "Slovenian", "Estonian", "Latvian", 
            "Lithuanian", "Ukrainian", "Belarusian", "Georgian", "Armenian", "Azerbaijani", "Kazakh",
            "Uzbek", "Kyrgyz", "Tajik", "Turkmen", "Mongolian", "Tibetan", "Burmese", "Khmer",
            "Lao", "Sinhala", "Nepali", "Pashto", "Persian (Farsi)", "Kurdish", "Amharic", "Somali",
            "Hausa", "Yoruba", "Igbo", "Zulu", "Xhosa", "Afrikaans", "Catalan", "Basque", "Galician",
            "Welsh", "Irish", "Scottish Gaelic", "Icelandic", "Maltese", "Albanian", "Macedonian",
            "Bosnian", "Montenegrin", "Luxembourgish"
        ];

        this.init();
    }

    init() {
        console.log('Initializing FWEA-I Audio Editor...');
        this.initializeStripe();
        this.setupEventListeners();
        this.initializeWaveform();
        this.createLanguageBanner();
        this.updateStepIndicator();
        console.log('FWEA-I Audio Editor initialized successfully');
    }

    initializeStripe() {
        // Initialize Stripe (replace with your actual publishable key)
        if (typeof Stripe !== 'undefined') {
            this.stripe = Stripe('pk_test_your_publishable_key_here');
            console.log('Stripe initialized');
        } else {
            console.log('Stripe not available - running in demo mode');
        }
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Upload functionality
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        const browseBtn = document.getElementById('browseBtn');

        if (uploadZone && fileInput && browseBtn) {
            // Enhanced drag and drop events
            uploadZone.addEventListener('dragover', this.handleDragOver.bind(this));
            uploadZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
            uploadZone.addEventListener('drop', this.handleDrop.bind(this));
            uploadZone.addEventListener('dragenter', this.handleDragEnter.bind(this));

            // File input events
            browseBtn.addEventListener('click', () => {
                console.log('Browse button clicked');
                fileInput.click();
            });
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
            
            console.log('Upload event listeners set up successfully');
        } else {
            console.error('Upload elements not found');
        }

        // Preview controls - set up even if elements are hidden initially
        this.setupPreviewControls();

        // Action buttons
        this.setupActionButtons();

        // Modal controls
        this.setupModalControls();

        // Navigation links
        this.setupNavigation();

        // Keyboard events
        document.addEventListener('keydown', this.handleKeydown.bind(this));

        // Window resize for responsive waveform
        window.addEventListener('resize', this.handleResize.bind(this));
        
        console.log('All event listeners set up successfully');
    }

    setupPreviewControls() {
        const playBtn = document.getElementById('playBtn');
        const audioTimeline = document.getElementById('audioTimeline');
        
        if (playBtn) {
            playBtn.addEventListener('click', this.togglePreview.bind(this));
        }
        
        if (audioTimeline) {
            audioTimeline.addEventListener('click', this.seekPreview.bind(this));
        }

        // A/B Comparison controls
        const originalBtn = document.getElementById('originalBtn');
        const cleanedBtn = document.getElementById('cleanedBtn');
        
        if (originalBtn) {
            originalBtn.addEventListener('click', () => this.switchAudioVersion('original'));
        }
        
        if (cleanedBtn) {
            cleanedBtn.addEventListener('click', () => this.switchAudioVersion('cleaned'));
        }

        // Waveform controls
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.zoomWaveform(1.5));
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.zoomWaveform(0.75));
        }
    }

    setupActionButtons() {
        const purchaseBtn = document.getElementById('purchaseBtn');
        const reprocessBtn = document.getElementById('reprocessBtn');
        
        if (purchaseBtn) {
            purchaseBtn.addEventListener('click', this.showPricingModal.bind(this));
            console.log('Purchase button listener added');
        }
        
        if (reprocessBtn) {
            reprocessBtn.addEventListener('click', this.resetEditor.bind(this));
        }

        // Add a test button to show pricing modal for demo purposes
        const testPricingBtn = document.createElement('button');
        testPricingBtn.textContent = 'Show Pricing (Demo)';
        testPricingBtn.className = 'btn btn--secondary';
        testPricingBtn.style.cssText = 'position: fixed; top: 200px; right: 20px; z-index: 1000;';
        testPricingBtn.addEventListener('click', this.showPricingModal.bind(this));
        document.body.appendChild(testPricingBtn);
    }

    setupModalControls() {
        const modalClose = document.getElementById('modalClose');
        const modalBackdrop = document.getElementById('modalBackdrop');
        
        if (modalClose) {
            modalClose.addEventListener('click', this.hidePricingModal.bind(this));
        }
        
        if (modalBackdrop) {
            modalBackdrop.addEventListener('click', this.hidePricingModal.bind(this));
        }

        // Pricing buttons
        const pricingBtns = document.querySelectorAll('.pricing-btn');
        pricingBtns.forEach(btn => {
            btn.addEventListener('click', this.handlePurchase.bind(this));
        });
    }

    setupNavigation() {
        // Handle navigation clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-link')) {
                const href = e.target.getAttribute('href');
                
                if (href === '#features') {
                    e.preventDefault();
                    const featuresSection = document.getElementById('features');
                    if (featuresSection) {
                        featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
                
                if (href === '#pricing') {
                    e.preventDefault();
                    this.showPricingModal();
                }
            }
        });
    }

    handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('drag-over');
        
        // Add visual feedback
        const uploadTitle = e.currentTarget.querySelector('.upload-title');
        if (uploadTitle) {
            uploadTitle.textContent = 'Release to upload your file';
        }
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Only remove drag-over if we're actually leaving the drop zone
        if (!e.currentTarget.contains(e.relatedTarget)) {
            e.currentTarget.classList.remove('drag-over');
            const uploadTitle = e.currentTarget.querySelector('.upload-title');
            if (uploadTitle) {
                uploadTitle.textContent = 'Drop your audio file here';
            }
        }
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');
        
        console.log('File dropped');
        
        const uploadTitle = e.currentTarget.querySelector('.upload-title');
        if (uploadTitle) {
            uploadTitle.textContent = 'Drop your audio file here';
        }
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            console.log('Processing dropped file:', files[0].name);
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            console.log('File selected:', file.name);
            this.processFile(file);
        }
    }

    processFile(file) {
        console.log('Processing file:', file.name, 'Size:', file.size);
        
        // Enhanced file validation
        if (!this.validateAudioFile(file)) {
            this.showNotification('Please upload a valid audio file (MP3, WAV, FLAC, M4A, AAC, OGG)', 'error');
            return;
        }

        // Validate file size (100MB limit)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            this.showNotification('File size must be less than 100MB', 'error');
            return;
        }

        this.currentFile = file;
        this.showFileInfo(file);
        
        // Start processing after a short delay
        setTimeout(() => {
            this.startProcessing();
        }, 1000);
    }

    validateAudioFile(file) {
        const validTypes = [
            'audio/mpeg', 'audio/mp3',
            'audio/wav', 'audio/wave', 
            'audio/flac',
            'audio/mp4', 'audio/m4a',
            'audio/aac',
            'audio/ogg'
        ];
        
        const validExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        return validTypes.includes(file.type) || validExtensions.includes(fileExtension);
    }

    showFileInfo(file) {
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        
        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = this.formatFileSize(file.size);
        
        if (fileInfo) {
            fileInfo.classList.remove('hidden');
            
            // Add animation
            setTimeout(() => {
                fileInfo.style.opacity = '0';
                fileInfo.style.transform = 'translateY(20px)';
                fileInfo.style.transition = 'all 0.3s ease';
                
                setTimeout(() => {
                    fileInfo.style.opacity = '1';
                    fileInfo.style.transform = 'translateY(0)';
                }, 50);
            }, 100);
        }
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    async startProcessing() {
        if (this.isProcessing) return;
        
        console.log('Starting processing...');
        
        this.isProcessing = true;
        this.currentStep = 2;
        this.updateStepIndicator();
        
        // Show processing section with animation
        const processingSection = document.getElementById('processingSection');
        if (processingSection) {
            processingSection.classList.remove('hidden');
            console.log('Processing section shown');
        }
        
        // Hide preview section
        const previewSection = document.getElementById('previewSection');
        if (previewSection) {
            previewSection.classList.add('hidden');
        }
        
        // Smooth scroll to processing section
        setTimeout(() => {
            if (processingSection) {
                processingSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }, 300);

        // Start enhanced waveform animation
        this.animateWaveform();

        // Process through stages with realistic timing
        let totalEstimatedTime = this.processingStages.reduce((sum, stage) => sum + stage.estimatedTime, 0);
        let remainingTime = totalEstimatedTime;

        for (let i = 0; i < this.processingStages.length; i++) {
            const stage = this.processingStages[i];
            
            console.log(`Processing stage ${i + 1}: ${stage.name}`);
            
            // Update UI
            const statusEl = document.getElementById('processingStatus');
            if (statusEl) {
                statusEl.textContent = stage.description;
            }
            
            this.updateProgress(stage.progress);
            this.updateStageMarkers(i);
            this.updateTimeRemaining(remainingTime);
            
            // Simulate language detection at stage 2
            if (i === 2) {
                setTimeout(() => this.simulateLanguageDetection(), 1000);
            }
            
            // Variable delay for realism - shorter for demo
            const stageDelay = Math.min(stage.estimatedTime * 100, 2000); // Max 2 seconds per stage
            await this.delay(stageDelay);
            
            remainingTime -= stage.estimatedTime;
        }

        // Processing complete
        console.log('Processing complete');
        this.isProcessing = false;
        this.currentStep = 3;
        this.updateStepIndicator();
        this.showPreview();
    }

    updateProgress(progress) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(progress)}%`;
        }
    }

    updateStageMarkers(currentStageIndex) {
        const stageMarkers = document.querySelectorAll('.stage-marker .stage-dot');
        
        stageMarkers.forEach((dot, index) => {
            dot.classList.remove('active', 'completed');
            
            if (index < currentStageIndex) {
                dot.classList.add('completed');
            } else if (index === currentStageIndex) {
                dot.classList.add('active');
            }
        });
    }

    updateTimeRemaining(seconds) {
        const timeRemainingEl = document.getElementById('timeRemaining');
        if (!timeRemainingEl) return;
        
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        
        if (seconds <= 0) {
            timeRemainingEl.textContent = 'Almost done!';
        } else {
            timeRemainingEl.textContent = `~${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    updateStepIndicator() {
        const steps = document.querySelectorAll('.step');
        
        steps.forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('step--active', 'step--completed');
            
            if (stepNumber < this.currentStep) {
                step.classList.add('step--completed');
            } else if (stepNumber === this.currentStep) {
                step.classList.add('step--active');
            }
        });
    }

    simulateLanguageDetection() {
        const detectedLanguagesEl = document.getElementById('detectedLanguages');
        if (!detectedLanguagesEl) return;
        
        detectedLanguagesEl.innerHTML = '';

        // Simulate detecting 1-4 random languages
        const numLanguages = Math.floor(Math.random() * 4) + 1;
        const shuffled = [...this.supportedLanguages].sort(() => 0.5 - Math.random());
        const detected = shuffled.slice(0, numLanguages);

        detected.forEach((lang, index) => {
            setTimeout(() => {
                const tag = document.createElement('span');
                tag.className = 'language-tag';
                tag.textContent = lang;
                tag.style.opacity = '0';
                tag.style.transform = 'translateY(10px)';
                detectedLanguagesEl.appendChild(tag);
                
                // Animate in
                setTimeout(() => {
                    tag.style.transition = 'all 0.4s ease';
                    tag.style.opacity = '1';
                    tag.style.transform = 'translateY(0)';
                }, 50);
            }, index * 400);
        });
    }

    initializeWaveform() {
        const canvas = document.getElementById('waveformCanvas');
        if (!canvas) {
            console.log('Waveform canvas not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Set canvas size with device pixel ratio for crisp rendering
        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        
        resizeCanvas();
        
        this.waveformCtx = ctx;
        this.waveformCanvas = canvas;
        this.waveformRect = canvas.getBoundingClientRect();
    }

    handleResize() {
        if (this.waveformCanvas && this.waveformCtx) {
            const rect = this.waveformCanvas.getBoundingClientRect();
            this.waveformCanvas.width = rect.width * window.devicePixelRatio;
            this.waveformCanvas.height = rect.height * window.devicePixelRatio;
            this.waveformCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.waveformRect = rect;
        }
    }

    animateWaveform() {
        if (!this.waveformCtx || !this.waveformRect) return;
        
        const ctx = this.waveformCtx;
        const rect = this.waveformRect;
        
        let animationFrame;
        let time = 0;
        
        const animate = () => {
            ctx.clearRect(0, 0, rect.width, rect.height);
            
            // Draw enhanced waveform bars
            const barCount = Math.floor(rect.width / (3 * this.waveformZoom));
            const centerY = rect.height / 2;
            
            // Draw original waveform (background)
            for (let i = 0; i < barCount; i++) {
                const x = (i * rect.width) / barCount;
                const frequency = 0.015 + (i / barCount) * 0.008;
                const amplitude = Math.sin(time * frequency + i * 0.08) * (rect.height * 0.25);
                const height = Math.abs(amplitude) + 3;
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect(x, centerY - height / 2, 2, height);
            }
            
            // Draw processed waveform (foreground) with gradient
            for (let i = 0; i < barCount; i++) {
                const x = (i * rect.width) / barCount;
                const frequency = 0.02 + (i / barCount) * 0.01;
                const amplitude = Math.sin(time * frequency + i * 0.1) * (rect.height * 0.35);
                const height = Math.abs(amplitude) + 5;
                
                // Create gradient for each bar
                const progress = i / barCount;
                const hue = 180 + progress * 60; // Blue to green transition
                const saturation = 70 + Math.abs(amplitude) / (rect.height * 0.35) * 30;
                const lightness = 60 + Math.abs(amplitude) / (rect.height * 0.35) * 20;
                
                ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.8 + Math.abs(amplitude) / (rect.height * 0.35) * 0.2})`;
                ctx.fillRect(x, centerY - height / 2, 2, height);
            }
            
            time += 0.08;
            
            if (this.isProcessing) {
                animationFrame = requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    zoomWaveform(factor) {
        this.waveformZoom = Math.max(0.5, Math.min(3, this.waveformZoom * factor));
        this.showNotification(`Waveform zoom: ${Math.round(this.waveformZoom * 100)}%`, 'info');
    }

    showPreview() {
        console.log('Showing preview...');
        
        // Hide processing section
        const processingSection = document.getElementById('processingSection');
        if (processingSection) {
            processingSection.classList.add('hidden');
        }
        
        // Show preview section with animation
        const previewSection = document.getElementById('previewSection');
        if (previewSection) {
            previewSection.classList.remove('hidden');
            console.log('Preview section shown');
        }
        
        // Update preview time limit based on default (will be updated when user selects plan)
        this.updatePreviewTimeLimit();
        
        // Scroll to preview with delay for animation
        setTimeout(() => {
            if (previewSection) {
                previewSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }, 300);

        // Generate preview audio (simulated)
        this.generatePreviewAudio();
    }

    updatePreviewTimeLimit() {
        const previewTimeLimitEl = document.getElementById('previewTimeLimit');
        const totalTimeEl = document.getElementById('totalTime');
        
        const minutes = Math.floor(this.previewDuration / 60);
        const seconds = this.previewDuration % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (previewTimeLimitEl) {
            previewTimeLimitEl.textContent = `${this.previewDuration}-second preview available`;
        }
        
        if (totalTimeEl) {
            totalTimeEl.textContent = timeString;
        }
    }

    generatePreviewAudio() {
        // Initialize audio context if needed
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('Audio context created');
            } catch (e) {
                console.log('Audio context not supported');
                return;
            }
        }

        // Create a more complex audio buffer for preview
        const sampleRate = this.audioContext.sampleRate;
        const duration = this.previewDuration;
        const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);

        // Generate more realistic audio simulation
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < channelData.length; i++) {
                const time = i / sampleRate;
                
                // Create a complex waveform with multiple frequencies
                let sample = 0;
                sample += Math.sin(440 * 2 * Math.PI * time) * 0.1; // Base frequency
                sample += Math.sin(880 * 2 * Math.PI * time) * 0.05; // Harmonic
                sample += Math.sin(220 * 2 * Math.PI * time) * 0.03; // Sub-harmonic
                
                // Add some variation and decay
                sample *= Math.exp(-time * 0.5);
                sample *= (1 + Math.sin(time * 2) * 0.3); // Modulation
                
                channelData[i] = sample;
            }
        }

        this.previewBuffer = buffer;
        console.log('Preview audio generated');
    }

    togglePreview() {
        if (!this.previewBuffer) {
            this.showNotification('Preview audio not ready', 'warning');
            return;
        }
        
        const playBtn = document.getElementById('playBtn');
        const playIcon = playBtn?.querySelector('.play-icon');
        const pauseIcon = playBtn?.querySelector('.pause-icon');

        if (this.previewAudio && !this.previewAudio.ended) {
            this.pausePreview();
            playIcon?.classList.remove('hidden');
            pauseIcon?.classList.add('hidden');
        } else {
            this.startPreview();
            playIcon?.classList.add('hidden');
            pauseIcon?.classList.remove('hidden');
        }
    }

    startPreview() {
        if (!this.audioContext || !this.previewBuffer) return;

        // Resume audio context if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Stop any existing preview
        this.stopPreview();

        // Create new audio source
        this.previewAudio = this.audioContext.createBufferSource();
        this.previewAudio.buffer = this.previewBuffer;
        
        // Create gain node for volume control
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.3;
        
        // Connect audio chain
        this.previewAudio.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Start playback from current position
        this.previewAudio.start(0, this.currentPreviewTime);
        this.startPreviewTimer();

        // Handle end of playback
        this.previewAudio.onended = () => {
            if (this.currentPreviewTime >= this.previewDuration) {
                this.showPaywall();
            }
            this.resetPreviewUI();
        };
        
        console.log('Preview started');
    }

    pausePreview() {
        if (this.previewAudio) {
            this.previewAudio.stop();
            this.previewAudio = null;
        }
        this.stopPreviewTimer();
        console.log('Preview paused');
    }

    stopPreview() {
        if (this.previewAudio) {
            this.previewAudio.stop();
            this.previewAudio = null;
        }
        this.stopPreviewTimer();
        this.currentPreviewTime = 0;
        this.updatePreviewUI();
    }

    startPreviewTimer() {
        this.previewStartTime = Date.now() - (this.currentPreviewTime * 1000);
        
        this.previewTimer = setInterval(() => {
            const elapsed = (Date.now() - this.previewStartTime) / 1000;
            this.currentPreviewTime = Math.min(elapsed, this.previewDuration);
            this.updatePreviewUI();
            
            if (this.currentPreviewTime >= this.previewDuration) {
                this.stopPreviewTimer();
                this.showPaywall();
                this.resetPreviewUI();
            }
        }, 50); // More frequent updates for smoother animation
    }

    stopPreviewTimer() {
        if (this.previewTimer) {
            clearInterval(this.previewTimer);
            this.previewTimer = null;
        }
    }

    updatePreviewUI() {
        const progressFill = document.getElementById('audioProgressFill');
        const currentTimeEl = document.getElementById('currentTime');
        const playhead = document.getElementById('audioPlayhead');
        
        const progress = (this.currentPreviewTime / this.previewDuration) * 100;
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        if (playhead) {
            playhead.style.left = `${progress}%`;
        }
        
        if (currentTimeEl) {
            const minutes = Math.floor(this.currentPreviewTime / 60);
            const seconds = Math.floor(this.currentPreviewTime % 60);
            currentTimeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    resetPreviewUI() {
        const playBtn = document.getElementById('playBtn');
        const playIcon = playBtn?.querySelector('.play-icon');
        const pauseIcon = playBtn?.querySelector('.pause-icon');
        
        playIcon?.classList.remove('hidden');
        pauseIcon?.classList.add('hidden');
    }

    seekPreview(e) {
        const timeline = e.currentTarget;
        const rect = timeline.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        
        this.currentPreviewTime = Math.max(0, Math.min(percentage * this.previewDuration, this.previewDuration));
        this.updatePreviewUI();
        
        // If playing, restart from new position
        if (this.previewAudio) {
            const wasPlaying = !this.previewAudio.ended;
            this.stopPreview();
            if (wasPlaying) {
                setTimeout(() => this.startPreview(), 100);
            }
        }
    }

    switchAudioVersion(version) {
        const originalBtn = document.getElementById('originalBtn');
        const cleanedBtn = document.getElementById('cleanedBtn');
        
        // Update button states
        originalBtn?.classList.toggle('active', version === 'original');
        cleanedBtn?.classList.toggle('active', version === 'cleaned');
        
        this.showNotification(`Switched to ${version} audio`, 'info');
        
        // Restart preview with new audio if playing
        if (this.previewAudio) {
            this.stopPreview();
            setTimeout(() => this.startPreview(), 200);
        }
    }

    showPaywall() {
        this.showNotification('Preview time expired! Choose a plan to download your clean audio file.', 'warning');
        setTimeout(() => this.showPricingModal(), 500);
    }

    showPricingModal() {
        console.log('Showing pricing modal');
        
        this.currentStep = 4;
        this.updateStepIndicator();
        
        const modal = document.getElementById('pricingModal');
        if (!modal) {
            console.error('Pricing modal not found');
            return;
        }
        
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Add entrance animation
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.transform = 'scale(0.9) translateY(20px)';
            modalContent.style.opacity = '0';
            
            setTimeout(() => {
                modalContent.style.transition = 'all 0.3s ease';
                modalContent.style.transform = 'scale(1) translateY(0)';
                modalContent.style.opacity = '1';
            }, 50);
        }
    }

    hidePricingModal() {
        console.log('Hiding pricing modal');
        
        const modal = document.getElementById('pricingModal');
        if (!modal) return;
        
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.transform = 'scale(0.9) translateY(20px)';
            modalContent.style.opacity = '0';
        }
        
        setTimeout(() => {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
            if (modalContent) {
                modalContent.style.transition = '';
                modalContent.style.transform = '';
                modalContent.style.opacity = '';
            }
        }, 200);
    }

    async handlePurchase(e) {
        const button = e.currentTarget;
        const priceId = button.dataset.priceId;
        const previewLength = parseInt(button.dataset.previewLength);
        
        console.log('Purchase initiated for:', priceId);
        
        // Find the selected tier
        this.selectedTier = this.pricingTiers.find(tier => tier.priceId === priceId);
        
        // Update preview length based on selected tier
        this.previewDuration = previewLength;
        this.updatePreviewTimeLimit();
        
        // Add loading state to button
        const originalText = button.textContent;
        button.textContent = 'Processing...';
        button.disabled = true;
        
        try {
            // Simulate processing delay
            await this.delay(2000);
            
            // For demo purposes, simulate successful payment
            this.simulateSuccessfulPurchase(this.selectedTier);
        } catch (error) {
            console.error('Payment error:', error);
            this.showNotification('Payment failed. Please try again.', 'error');
        } finally {
            this.resetButton(button, originalText);
        }
    }

    resetButton(button, originalText) {
        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, 1000);
    }

    simulateSuccessfulPurchase(tier) {
        this.showNotification(`Payment successful for ${tier.name}! In a real implementation, you would receive your clean audio file.`, 'success');
        this.hidePricingModal();
        
        // Show download simulation
        setTimeout(() => {
            this.showNotification('Download starting...', 'info');
        }, 1000);
    }

    resetEditor() {
        console.log('Resetting editor');
        
        // Reset all state
        this.currentFile = null;
        this.isProcessing = false;
        this.currentPreviewTime = 0;
        this.currentStep = 1;
        this.selectedTier = null;
        this.previewDuration = 30; // Reset to default
        this.stopPreview();
        
        // Hide sections
        document.getElementById('processingSection')?.classList.add('hidden');
        document.getElementById('previewSection')?.classList.add('hidden');
        document.getElementById('fileInfo')?.classList.add('hidden');
        
        // Reset file input
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';
        
        // Reset progress
        this.updateProgress(0);
        this.updateStepIndicator();
        
        // Reset detected languages
        const detectedLangs = document.getElementById('detectedLanguages');
        if (detectedLangs) {
            detectedLangs.innerHTML = '<span class="language-tag analyzing">Analyzing...</span>';
        }
        
        // Reset upload title
        const uploadTitle = document.querySelector('.upload-title');
        if (uploadTitle) {
            uploadTitle.textContent = 'Drop your audio file here';
        }
        
        // Scroll to top
        const uploadSection = document.querySelector('.upload-section');
        if (uploadSection) {
            uploadSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }

        this.showNotification('Editor reset. Ready for new file!', 'success');
    }

    createLanguageBanner() {
        const languageScroll = document.getElementById('languageScroll');
        if (!languageScroll) return;
        
        // Create multiple copies for seamless scrolling
        const duplicatedLanguages = [...this.supportedLanguages, ...this.supportedLanguages, ...this.supportedLanguages];
        
        languageScroll.innerHTML = '';
        duplicatedLanguages.forEach(lang => {
            const span = document.createElement('span');
            span.className = 'language-item';
            span.textContent = lang;
            languageScroll.appendChild(span);
        });
    }

    handleKeydown(e) {
        // ESC key to close modal
        if (e.key === 'Escape') {
            this.hidePricingModal();
        }
        
        // Space to toggle preview (when not in input fields)
        if (e.key === ' ' && !document.getElementById('previewSection')?.classList.contains('hidden') && !e.target.matches('input, textarea, button')) {
            e.preventDefault();
            this.togglePreview();
        }
        
        // R key to reset editor
        if (e.key === 'r' && e.ctrlKey) {
            e.preventDefault();
            this.resetEditor();
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        
        // Add icon based on type
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        
        notification.innerHTML = `
            <span class="notification-icon">${icons[type] || icons.info}</span>
            <span class="notification-message">${message}</span>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 120px;
            right: 20px;
            padding: 16px 20px;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-base);
            color: var(--color-text);
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 12px;
            max-width: 400px;
            animation: slideInNotification 0.3s ease;
        `;
        
        // Type-specific styling
        const typeColors = {
            success: 'var(--color-emerald)',
            error: 'var(--color-red-400)',
            warning: 'var(--color-soft-gold)',
            info: 'var(--color-electric-blue)'
        };
        
        notification.style.borderLeftColor = typeColors[type] || typeColors.info;
        notification.style.borderLeftWidth = '4px';
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutNotification 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing FWEA-I Audio Editor');
    try {
        window.audioEditor = new FWEAAudioEditor();
        console.log('Audio editor initialized successfully');
    } catch (error) {
        console.error('Failed to initialize audio editor:', error);
    }
});

// Handle audio context resume for better browser compatibility
document.addEventListener('click', () => {
    if (window.AudioContext || window.webkitAudioContext) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
        } catch (e) {
            // Audio context not supported
        }
    }
}, { once: true });

// Add notification animations to CSS
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
    @keyframes slideInNotification {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutNotification {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-icon {
        font-weight: bold;
        font-size: 16px;
    }
    
    .notification-message {
        flex: 1;
        font-size: 14px;
        line-height: 1.4;
    }
`;
document.head.appendChild(notificationStyle);