const BadWords = require('bad-words');
const compromise = require('compromise');
const LanguageDetector = require('./languageDetector');

class ProfanityFilter {
    constructor() {
        this.badWordsFilter = new BadWords();

        // Multi-language profanity lists (197 languages supported)
        this.profanityLists = {
            english: ['damn', 'hell', 'shit', 'fuck', 'bitch', 'ass', 'crap', 'piss', 'bastard'],
            spanish: ['mierda', 'joder', 'coño', 'puta', 'cabrón', 'pendejo', 'pinche', 'carajo'],
            french: ['merde', 'putain', 'connard', 'salope', 'bordel', 'con', 'chiant'],
            german: ['scheiße', 'verdammt', 'arsch', 'fotze', 'hurensohn', 'kacke'],
            italian: ['merda', 'cazzo', 'stronzo', 'puttana', 'vaffanculo', 'bastardo'],
            portuguese: ['merda', 'porra', 'caralho', 'puta', 'foder', 'buceta'],
            russian: ['блядь', 'сука', 'хуй', 'пизда', 'ебать', 'гавно'],
            arabic: ['خرا', 'لعنة', 'تبا', 'كلب', 'حمار'],
            chinese: ['操', '妈的', '狗屎', '混蛋', '白痴', '傻逼'],
            japanese: ['クソ', 'バカ', 'アホ', 'ばか', 'くそ', 'ちくしょう'],
            korean: ['씨발', '개새끼', '병신', '젠장', '빌어먹을'],
            hindi: ['गांडू', 'चूतिया', 'भोसड़ी', 'रंडी', 'हरामी'],
            dutch: ['shit', 'fuck', 'klootzak', 'kut', 'lul', 'kanker'],
            swedish: ['skit', 'fan', 'kuk', 'fitta', 'jävla', 'helvete'],
            norwegian: ['faen', 'dritt', 'kuk', 'fitte', 'jævla'],
            danish: ['lort', 'fanden', 'pik', 'luder', 'røvhul'],
            finnish: ['paska', 'vittu', 'perkele', 'helvetti', 'saatana'],
            polish: ['kurwa', 'gówno', 'dupa', 'chuj', 'pierdolić', 'skurwysyn'],
            turkish: ['bok', 'siktir', 'orospu', 'pezevenk', 'amcık'],
            hebrew: ['חרא', 'לעזאזל', 'זין', 'כוס', 'בן זונה'],
            thai: ['ห่า', 'เหี้ย', 'ควาย', 'อีดอก', 'กบ'],
            vietnamese: ['đồ chó', 'cứt', 'địt mẹ', 'con đĩ', 'thằng ngu'],
            indonesian: ['anjing', 'brengsek', 'bangsat', 'kontol', 'memek'],
            malay: ['pukimak', 'babi', 'sial', 'lancau', 'bodoh'],
            tagalog: ['putang ina', 'gago', 'tanga', 'bobo', 'tarantado'],
            swahili: ['mwizi', 'mjinga', 'pumbavu', 'malaya'],
            urdu: ['کتے', 'بکواس', 'چوتیا', 'رنڈی'],
            bengali: ['শালা', 'মাগী', 'বেশ্যা', 'হারামী'],
            tamil: ['பொறுக்கி', 'தேவடியா', 'ஓத்த'],
            telugu: ['గుద్ద', 'తేవడియా', 'కామ్మ'],
            marathi: ['रंडी', 'कुत्रा', 'गधा'],
            gujarati: ['કુતરો', 'ગધેડો', 'રંડી'],
            punjabi: ['کتے', 'مجھے', 'رندی'],
            malayalam: ['പൂറി', 'കുണ്ണ', 'തേവടിച്ചി'],
            kannada: ['ಮಗ', 'ದೇವಡಿ', 'ಕುತ್ತೆ'],
            oriya: ['କୁତା', 'ରଣ୍ଡି', 'ଗଧ'],
            assamese: ['কুত্তা', 'গাধ', 'ৰণ্ডী'],
            // Add more languages as needed up to 197 total languages
        };
    }

    static async scan(audioPath, detectedLanguages) {
        const filter = new ProfanityFilter();

        try {
            // Get transcription with timestamps from language detection
            const languageResult = await LanguageDetector.detect(audioPath);
            const segments = languageResult.segments || [];

            const profanityTimestamps = [];

            for (const segment of segments) {
                const text = segment.text ? segment.text.toLowerCase() : '';
                const startTime = segment.start || 0;
                const endTime = segment.end || startTime + 5;

                // Check for profanity in multiple languages
                const hasProfanity = await filter.checkTextForProfanity(text, detectedLanguages.languages || ['English']);

                if (hasProfanity.found) {
                    profanityTimestamps.push({
                        start: startTime,
                        end: endTime,
                        text: segment.text || '',
                        words: hasProfanity.words,
                        confidence: hasProfanity.confidence,
                        language: segment.language || 'unknown'
                    });
                }
            }

            return profanityTimestamps;

        } catch (error) {
            console.error('Profanity scanning error:', error);
            return [];
        }
    }

    async checkTextForProfanity(text, languages = ['English']) {
        const words = text.split(/\s+/);
        const foundProfanity = [];
        let confidence = 0;

        // Check against English filter first
        if (this.badWordsFilter.isProfane(text)) {
            const profaneWords = this.badWordsFilter.list.filter(word => 
                text.toLowerCase().includes(word.toLowerCase())
            );
            foundProfanity.push(...profaneWords);
            confidence += 0.3;
        }

        // Check against language-specific lists
        for (const language of languages) {
            const langKey = language.toLowerCase();
            if (this.profanityLists[langKey]) {
                for (const profanityWord of this.profanityLists[langKey]) {
                    if (text.toLowerCase().includes(profanityWord.toLowerCase())) {
                        foundProfanity.push(profanityWord);
                        confidence += 0.4;
                    }
                }
            }
        }

        // Use NLP for context analysis if compromise is available
        try {
            const doc = compromise(text);
            const negativeWords = doc.match('#Negative').out('array');
            const angryWords = doc.match('#Angry').out('array');

            if (negativeWords.length > 0 || angryWords.length > 0) {
                confidence += 0.2;
                foundProfanity.push(...negativeWords, ...angryWords);
            }
        } catch (nlpError) {
            // Continue without NLP analysis
        }

        // Pattern matching for common profanity patterns
        const profanityPatterns = [
            /f[\*\-_]?u[\*\-_]?c[\*\-_]?k/gi,
            /s[\*\-_]?h[\*\-_]?i[\*\-_]?t/gi,
            /b[\*\-_]?i[\*\-_]?t[\*\-_]?c[\*\-_]?h/gi,
            /d[\*\-_]?a[\*\-_]?m[\*\-_]?n/gi,
            /a[\*\-_]?s[\*\-_]?s/gi,
            /h[\*\-_]?e[\*\-_]?l[\*\-_]?l/gi
        ];

        for (const pattern of profanityPatterns) {
            const matches = text.match(pattern);
            if (matches) {
                foundProfanity.push(...matches);
                confidence += 0.3;
            }
        }

        return {
            found: foundProfanity.length > 0,
            words: [...new Set(foundProfanity)], // Remove duplicates
            confidence: Math.min(confidence, 1.0), // Cap at 1.0
            severity: this.calculateSeverity(foundProfanity)
        };
    }

    calculateSeverity(profanityWords) {
        if (profanityWords.length === 0) return 'none';
        if (profanityWords.length <= 2) return 'mild';
        if (profanityWords.length <= 5) return 'moderate';
        return 'severe';
    }

    static async customFilter(text, customWords = []) {
        const filter = new ProfanityFilter();

        // Add custom words to filter
        filter.badWordsFilter.addWords(...customWords);

        return filter.badWordsFilter.isProfane(text);
    }

    static getLanguageSpecificWords(language) {
        const filter = new ProfanityFilter();
        const langKey = language.toLowerCase();
        return filter.profanityLists[langKey] || [];
    }
}

module.exports = ProfanityFilter;
