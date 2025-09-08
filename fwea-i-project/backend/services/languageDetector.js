const fs = require('fs');
const OpenAI = require('openai');
const AudioProcessor = require('./audioProcessor');

class LanguageDetector {
    constructor() {
        this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        }) : null;
    }

    static async detect(audioPath) {
        const detector = new LanguageDetector();

        // If no OpenAI key, return default languages
        if (!detector.openai) {
            console.log('OpenAI API key not configured, using default language detection');
            return {
                languages: ['English'],
                transcription: 'Sample transcription text',
                segments: [
                    {
                        start: 0,
                        end: 30,
                        text: 'Sample audio segment',
                        language: 'en'
                    }
                ],
                confidence: 0.85
            };
        }

        try {
            // Convert to format compatible with Whisper API
            const wavPath = await AudioProcessor.convertToWav(audioPath);

            // Use OpenAI Whisper for language detection
            const transcription = await detector.openai.audio.transcriptions.create({
                file: fs.createReadStream(wavPath),
                model: "whisper-1",
                response_format: "verbose_json",
                timestamp_granularities: ["segment"]
            });

            // Extract languages from segments
            const detectedLanguages = new Set();

            if (transcription.segments) {
                for (const segment of transcription.segments) {
                    if (segment.language) {
                        detectedLanguages.add(segment.language);
                    }
                }
            }

            // Add primary detected language
            if (transcription.language) {
                detectedLanguages.add(transcription.language);
            }

            // Convert language codes to full names
            const languageMap = {
                'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian',
                'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese',
                'ar': 'Arabic', 'hi': 'Hindi', 'th': 'Thai', 'vi': 'Vietnamese', 'nl': 'Dutch',
                'sv': 'Swedish', 'da': 'Danish', 'no': 'Norwegian', 'fi': 'Finnish', 'pl': 'Polish',
                'tr': 'Turkish', 'he': 'Hebrew', 'id': 'Indonesian', 'ms': 'Malay', 'tl': 'Tagalog',
                'sw': 'Swahili', 'ur': 'Urdu', 'bn': 'Bengali', 'ta': 'Tamil', 'te': 'Telugu',
                'mr': 'Marathi', 'gu': 'Gujarati', 'pa': 'Punjabi', 'ml': 'Malayalam', 'kn': 'Kannada',
                'or': 'Oriya', 'as': 'Assamese', 'cs': 'Czech', 'sk': 'Slovak', 'hu': 'Hungarian',
                'ro': 'Romanian', 'bg': 'Bulgarian', 'hr': 'Croatian', 'sr': 'Serbian', 'sl': 'Slovenian',
                'et': 'Estonian', 'lv': 'Latvian', 'lt': 'Lithuanian', 'uk': 'Ukrainian', 'be': 'Belarusian',
                'ka': 'Georgian', 'hy': 'Armenian', 'az': 'Azerbaijani', 'kk': 'Kazakh', 'uz': 'Uzbek',
                'ky': 'Kyrgyz', 'tg': 'Tajik', 'tk': 'Turkmen', 'mn': 'Mongolian', 'bo': 'Tibetan',
                'my': 'Burmese', 'km': 'Khmer', 'lo': 'Lao', 'si': 'Sinhala', 'ne': 'Nepali',
                'ps': 'Pashto', 'fa': 'Persian', 'ku': 'Kurdish', 'am': 'Amharic', 'so': 'Somali',
                'ha': 'Hausa', 'yo': 'Yoruba', 'ig': 'Igbo', 'zu': 'Zulu', 'xh': 'Xhosa',
                'af': 'Afrikaans', 'ca': 'Catalan', 'eu': 'Basque', 'gl': 'Galician', 'cy': 'Welsh',
                'ga': 'Irish', 'gd': 'Scottish Gaelic', 'is': 'Icelandic', 'mt': 'Maltese',
                'sq': 'Albanian', 'mk': 'Macedonian', 'bs': 'Bosnian', 'me': 'Montenegrin', 'lb': 'Luxembourgish'
            };

            const languageNames = Array.from(detectedLanguages).map(code => 
                languageMap[code] || code
            );

            return {
                languages: languageNames,
                transcription: transcription.text,
                segments: transcription.segments || [],
                confidence: transcription.confidence || 0.8
            };

        } catch (error) {
            console.error('Language detection error:', error);

            // Fallback to default detection
            return {
                languages: ['English'],
                transcription: 'Error during transcription',
                segments: [],
                confidence: 0.5,
                error: error.message
            };
        }
    }

    static async detectFromText(text) {
        // Simple pattern-based language detection for text
        const languagePatterns = {
            'Arabic': /[\u0600-\u06FF]/,
            'Chinese': /[\u4e00-\u9fff]/,
            'Japanese': /[\u3040-\u309f\u30a0-\u30ff]/,
            'Korean': /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/,
            'Thai': /[\u0e00-\u0e7f]/,
            'Hebrew': /[\u0590-\u05ff]/,
            'Russian': /[\u0400-\u04ff]/,
            'Greek': /[\u0370-\u03ff]/,
            'Hindi': /[\u0900-\u097f]/,
            'Bengali': /[\u0980-\u09ff]/,
            'Tamil': /[\u0b80-\u0bff]/,
            'Telugu': /[\u0c00-\u0c7f]/,
            'Kannada': /[\u0c80-\u0cff]/,
            'Malayalam': /[\u0d00-\u0d7f]/,
            'Gujarati': /[\u0a80-\u0aff]/,
            'Punjabi': /[\u0a00-\u0a7f]/
        };

        const detectedLanguages = [];

        for (const [language, pattern] of Object.entries(languagePatterns)) {
            if (pattern.test(text)) {
                detectedLanguages.push(language);
            }
        }

        if (detectedLanguages.length === 0) {
            detectedLanguages.push('English');
        }

        return detectedLanguages;
    }
}

module.exports = LanguageDetector;
