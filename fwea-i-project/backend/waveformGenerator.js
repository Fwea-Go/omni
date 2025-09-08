const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');
const { WaveFile } = require('wavefile');

class WaveformGenerator {
    static async generate(audioPath, options = {}) {
        const {
            width = 800,
            height = 200,
            samples = 1000,
            precision = 2
        } = options;

        try {
            // Check if wavefile package is available
            const wavefileAvailable = true; // Assume available for now

            if (!wavefileAvailable) {
                // Generate dummy waveform data
                return this.generateDummyWaveform(width, height, samples);
            }

            // Convert audio to raw PCM data for analysis
            const tempWavPath = audioPath.replace(/\.([^/.]+)$/, '_temp.wav');

            // Convert to standard format for processing
            await new Promise((resolve, reject) => {
                ffmpeg.getAvailableFormats((err, formats) => {
                    if (err) {
                        console.warn('FFmpeg not available for waveform generation');
                        resolve();
                        return;
                    }

                    ffmpeg(audioPath)
                        .audioCodec('pcm_s16le')
                        .audioFrequency(44100)
                        .audioChannels(1) // Mono for simpler waveform
                        .on('error', (error) => {
                            console.error('Waveform conversion error:', error);
                            resolve();
                        })
                        .on('end', resolve)
                        .save(tempWavPath);
                });
            });

            let waveformData;

            try {
                // Read WAV file and extract PCM data if file exists
                const wavBuffer = await fs.readFile(tempWavPath);
                const wav = new WaveFile(wavBuffer);

                // Convert to 16-bit samples
                wav.toBitDepth('16');
                const samples16 = wav.getSamples();

                // Generate waveform data points
                waveformData = this.generateWaveformPoints(samples16, samples);

                // Clean up temp file
                await fs.unlink(tempWavPath).catch(() => {});

                return {
                    data: waveformData,
                    width,
                    height,
                    samples: samples16.length,
                    duration: wav.fmt.sampleRate ? samples16.length / wav.fmt.sampleRate : 0,
                    peaks: this.findPeaks(waveformData),
                    rms: this.calculateRMS(samples16)
                };

            } catch (fileError) {
                console.warn('Could not process WAV file, generating dummy data');
                return this.generateDummyWaveform(width, height, samples);
            }

        } catch (error) {
            console.error('Waveform generation error:', error);

            // Return dummy waveform data if generation fails
            return this.generateDummyWaveform(width, height, samples);
        }
    }

    static generateWaveformPoints(audioSamples, targetPoints) {
        const samplesPerPoint = Math.floor(audioSamples.length / targetPoints);
        const waveformPoints = [];

        for (let i = 0; i < targetPoints; i++) {
            const start = i * samplesPerPoint;
            const end = Math.min(start + samplesPerPoint, audioSamples.length);

            let max = 0;
            let min = 0;
            let sum = 0;

            for (let j = start; j < end; j++) {
                const sample = audioSamples[j] / 32768; // Normalize to -1 to 1
                max = Math.max(max, sample);
                min = Math.min(min, sample);
                sum += Math.abs(sample);
            }

            const avg = sum / (end - start);

            waveformPoints.push({
                max: max,
                min: min,
                avg: avg,
                rms: Math.sqrt(sum * sum / (end - start))
            });
        }

        return waveformPoints;
    }

    static findPeaks(waveformData, threshold = 0.7) {
        const peaks = [];

        for (let i = 1; i < waveformData.length - 1; i++) {
            const current = waveformData[i].max;
            const prev = waveformData[i - 1].max;
            const next = waveformData[i + 1].max;

            if (current > prev && current > next && current > threshold) {
                peaks.push({
                    index: i,
                    value: current,
                    time: (i / waveformData.length) // Relative time position
                });
            }
        }

        return peaks;
    }

    static calculateRMS(samples) {
        let sum = 0;
        for (const sample of samples) {
            const normalized = sample / 32768;
            sum += normalized * normalized;
        }
        return Math.sqrt(sum / samples.length);
    }

    static generateDummyWaveform(width, height, samples) {
        const waveformData = [];

        for (let i = 0; i < samples; i++) {
            // Generate realistic-looking dummy waveform
            const t = i / samples;
            const amplitude = Math.sin(t * Math.PI * 4) * Math.exp(-t * 2) * 0.5;
            const noise = (Math.random() - 0.5) * 0.1;
            const value = amplitude + noise;

            waveformData.push({
                max: Math.abs(value),
                min: -Math.abs(value),
                avg: value * 0.7,
                rms: Math.abs(value) * 0.8
            });
        }

        return {
            data: waveformData,
            width,
            height,
            samples: samples,
            duration: 180, // 3 minutes
            peaks: this.findPeaks(waveformData),
            rms: 0.3,
            isDummy: true
        };
    }

    static async generateSpectrogramData(audioPath, options = {}) {
        const {
            fftSize = 2048,
            hopSize = 512,
            windowFunction = 'hann'
        } = options;

        try {
            // This would require more complex FFT analysis
            // For now, return placeholder data
            return {
                frequencies: [],
                times: [],
                magnitudes: [],
                sampleRate: 44100,
                fftSize,
                message: 'Spectrogram generation not implemented'
            };
        } catch (error) {
            console.error('Spectrogram generation error:', error);
            return null;
        }
    }
}

module.exports = WaveformGenerator;
