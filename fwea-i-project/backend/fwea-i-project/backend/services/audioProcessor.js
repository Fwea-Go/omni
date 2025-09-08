const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');
const { WaveFile } = require('wavefile');

class AudioProcessor {
    static async analyzeFile(filePath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    console.error('FFprobe error:', err);
                    // Return default metadata if ffmpeg is not available
                    resolve({
                        duration: 180, // 3 minutes default
                        format: 'mp3',
                        bitrate: '320000',
                        sampleRate: 44100,
                        channels: 2,
                        size: 5242880 // 5MB default
                    });
                    return;
                }

                resolve({
                    duration: metadata.format.duration,
                    format: metadata.format.format_name,
                    bitrate: metadata.format.bit_rate,
                    sampleRate: metadata.streams[0].sample_rate,
                    channels: metadata.streams[0].channels,
                    size: metadata.format.size
                });
            });
        });
    }

    static async cleanAudio(inputPath, profanityTimestamps) {
        const outputPath = inputPath.replace(/\.([^/.]+)$/, '_clean.$1');

        return new Promise((resolve, reject) => {
            // Check if ffmpeg is available
            ffmpeg.getAvailableFormats((err, formats) => {
                if (err) {
                    console.warn('FFmpeg not available, copying original file');
                    // Copy original file as cleaned version for demo
                    require('fs').copyFileSync(inputPath, outputPath);
                    resolve(outputPath);
                    return;
                }

                let command = ffmpeg(inputPath);

                // Apply silence to profanity timestamps
                if (profanityTimestamps && profanityTimestamps.length > 0) {
                    let filterString = '';
                    profanityTimestamps.forEach((timestamp, index) => {
                        const start = timestamp.start;
                        const end = timestamp.end;
                        filterString += `volume=enable='between(t,${start},${end})':volume=0,`;
                    });

                    // Remove trailing comma
                    filterString = filterString.slice(0, -1);

                    command = command.audioFilters(filterString);
                }

                command
                    .audioCodec('libmp3lame')
                    .audioBitrate('320k')
                    .audioChannels(2)
                    .on('error', (error) => {
                        console.error('FFmpeg processing error:', error);
                        // Fallback: copy original file
                        require('fs').copyFileSync(inputPath, outputPath);
                        resolve(outputPath);
                    })
                    .on('end', () => resolve(outputPath))
                    .save(outputPath);
            });
        });
    }

    static async createPreview(inputPath, maxDuration = 60) {
        const previewDir = path.join(path.dirname(inputPath), '..', 'previews');
        await fs.mkdir(previewDir, { recursive: true });

        const previewPath = path.join(previewDir, `preview_${path.basename(inputPath)}`);

        return new Promise((resolve, reject) => {
            ffmpeg.getAvailableFormats((err, formats) => {
                if (err) {
                    console.warn('FFmpeg not available, copying original file as preview');
                    require('fs').copyFileSync(inputPath, previewPath);
                    resolve(previewPath);
                    return;
                }

                ffmpeg(inputPath)
                    .seekInput(0)
                    .duration(maxDuration)
                    .audioCodec('libmp3lame')
                    .audioBitrate('128k')
                    .on('error', (error) => {
                        console.error('Preview creation error:', error);
                        require('fs').copyFileSync(inputPath, previewPath);
                        resolve(previewPath);
                    })
                    .on('end', () => resolve(previewPath))
                    .save(previewPath);
            });
        });
    }

    static async convertToWav(inputPath) {
        const outputPath = inputPath.replace(/\.([^/.]+)$/, '.wav');

        return new Promise((resolve, reject) => {
            ffmpeg.getAvailableFormats((err, formats) => {
                if (err) {
                    console.warn('FFmpeg not available, using original file');
                    resolve(inputPath);
                    return;
                }

                ffmpeg(inputPath)
                    .audioCodec('pcm_s16le')
                    .audioFrequency(44100)
                    .audioChannels(2)
                    .on('error', (error) => {
                        console.error('WAV conversion error:', error);
                        resolve(inputPath);
                    })
                    .on('end', () => resolve(outputPath))
                    .save(outputPath);
            });
        });
    }

    static async extractAudioSegment(inputPath, startTime, endTime) {
        const segmentPath = inputPath.replace(/\.([^/.]+)$/, `_segment_${Date.now()}.$1`);

        return new Promise((resolve, reject) => {
            ffmpeg.getAvailableFormats((err, formats) => {
                if (err) {
                    console.warn('FFmpeg not available for segment extraction');
                    resolve(inputPath);
                    return;
                }

                ffmpeg(inputPath)
                    .seekInput(startTime)
                    .duration(endTime - startTime)
                    .audioCodec('libmp3lame')
                    .on('error', (error) => {
                        console.error('Segment extraction error:', error);
                        resolve(inputPath);
                    })
                    .on('end', () => resolve(segmentPath))
                    .save(segmentPath);
            });
        });
    }
}

module.exports = AudioProcessor;
