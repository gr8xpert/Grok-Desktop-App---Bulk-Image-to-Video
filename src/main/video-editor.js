// ============================================
// Video Editor - FFmpeg Integration
// ============================================

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class VideoEditor {
  constructor() {
    this.ffmpegPath = null;
    this.ffprobePath = null;
    this.currentProcess = null;
    this.isCancelled = false;
  }

  // Initialize FFmpeg paths
  async init() {
    // Check for bundled FFmpeg first
    const isPackaged = process.resourcesPath && !process.resourcesPath.includes('node_modules');

    if (isPackaged) {
      // Production: Use bundled FFmpeg
      this.ffmpegPath = path.join(process.resourcesPath, 'ffmpeg', 'ffmpeg.exe');
      this.ffprobePath = path.join(process.resourcesPath, 'ffmpeg', 'ffprobe.exe');
    } else {
      // Development: Check system FFmpeg or local assets
      const localFfmpeg = path.join(__dirname, '..', '..', 'assets', 'ffmpeg', 'ffmpeg.exe');
      const localFfprobe = path.join(__dirname, '..', '..', 'assets', 'ffmpeg', 'ffprobe.exe');

      if (fs.existsSync(localFfmpeg)) {
        this.ffmpegPath = localFfmpeg;
        this.ffprobePath = localFfprobe;
      } else {
        // Try system FFmpeg
        try {
          execSync('ffmpeg -version', { stdio: 'ignore' });
          this.ffmpegPath = 'ffmpeg';
          this.ffprobePath = 'ffprobe';
        } catch (e) {
          console.log('[VIDEO-EDITOR] FFmpeg not found');
          return false;
        }
      }
    }

    console.log('[VIDEO-EDITOR] FFmpeg path:', this.ffmpegPath);
    return this.isAvailable();
  }

  // Check if FFmpeg is available
  isAvailable() {
    if (!this.ffmpegPath) return false;

    try {
      if (this.ffmpegPath === 'ffmpeg') {
        execSync('ffmpeg -version', { stdio: 'ignore' });
      } else {
        if (!fs.existsSync(this.ffmpegPath)) return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // Get video information using FFprobe
  async getVideoInfo(videoPath) {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        videoPath
      ];

      const ffprobe = this.ffprobePath || 'ffprobe';
      const process = spawn(ffprobe, args);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(stdout);
            const videoStream = info.streams?.find(s => s.codec_type === 'video');
            const audioStream = info.streams?.find(s => s.codec_type === 'audio');

            resolve({
              duration: parseFloat(info.format?.duration) || 0,
              width: videoStream?.width || 0,
              height: videoStream?.height || 0,
              fps: eval(videoStream?.r_frame_rate) || 30,
              hasAudio: !!audioStream,
              codec: videoStream?.codec_name || 'unknown'
            });
          } catch (e) {
            reject(new Error('Failed to parse video info'));
          }
        } else {
          reject(new Error(stderr || 'FFprobe failed'));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }

  // Generate thumbnail from video
  async generateThumbnail(videoPath, outputPath, timeOffset = 1) {
    return new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-ss', timeOffset.toString(),
        '-i', videoPath,
        '-vframes', '1',
        '-vf', 'scale=200:-1',
        '-f', 'image2',
        outputPath
      ];

      const ffmpeg = spawn(this.ffmpegPath || 'ffmpeg', args);

      ffmpeg.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          // Convert to base64
          const buffer = fs.readFileSync(outputPath);
          const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
          // Clean up temp file
          try { fs.unlinkSync(outputPath); } catch (e) {}
          resolve(base64);
        } else {
          resolve('');
        }
      });

      ffmpeg.on('error', () => {
        resolve('');
      });
    });
  }

  // Merge videos with transitions
  async mergeVideos(clips, transition, outputPath, progressCallback) {
    return new Promise(async (resolve, reject) => {
      this.isCancelled = false;

      if (clips.length === 0) {
        return reject(new Error('No clips to merge'));
      }

      // Single clip - just copy
      if (clips.length === 1) {
        return this.copyVideo(clips[0].path, outputPath, progressCallback)
          .then(resolve)
          .catch(reject);
      }

      try {
        // Get total duration for progress calculation
        let totalDuration = 0;
        for (const clip of clips) {
          const info = await this.getVideoInfo(clip.path);
          clip.duration = info.duration;
          totalDuration += info.duration;
        }

        // Account for transitions reducing total time
        const transitionCount = clips.length - 1;
        const transitionDuration = transition.style !== 'none' ? transition.duration : 0;
        totalDuration -= transitionCount * transitionDuration;

        // Build FFmpeg command for merging with transitions
        const args = this.buildMergeCommand(clips, transition, outputPath);

        console.log('[VIDEO-EDITOR] Merge command:', args.join(' '));

        this.currentProcess = spawn(this.ffmpegPath || 'ffmpeg', args);

        let stderr = '';

        this.currentProcess.stderr.on('data', (data) => {
          stderr += data.toString();

          // Parse progress from FFmpeg output
          const timeMatch = stderr.match(/time=(\d{2}):(\d{2}):(\d{2})/);
          if (timeMatch && progressCallback) {
            const hours = parseInt(timeMatch[1]);
            const mins = parseInt(timeMatch[2]);
            const secs = parseInt(timeMatch[3]);
            const currentTime = hours * 3600 + mins * 60 + secs;
            const percent = Math.min(100, Math.round((currentTime / totalDuration) * 100));
            progressCallback({ percent, status: 'Merging videos...' });
          }
        });

        this.currentProcess.on('close', (code) => {
          this.currentProcess = null;

          if (this.isCancelled) {
            try { fs.unlinkSync(outputPath); } catch (e) {}
            return reject(new Error('Cancelled'));
          }

          if (code === 0) {
            resolve({ success: true, outputPath });
          } else {
            reject(new Error('FFmpeg merge failed: ' + stderr.slice(-500)));
          }
        });

        this.currentProcess.on('error', (err) => {
          this.currentProcess = null;
          reject(err);
        });

      } catch (e) {
        reject(e);
      }
    });
  }

  // Build FFmpeg command for merging videos with xfade transitions
  buildMergeCommand(clips, transition, outputPath) {
    const args = ['-y'];

    // Add all input files
    clips.forEach(clip => {
      args.push('-i', clip.path);
    });

    if (transition.style === 'none' || clips.length === 1) {
      // Simple concatenation without transitions
      const filterParts = [];
      clips.forEach((_, i) => {
        filterParts.push(`[${i}:v:0][${i}:a:0]`);
      });

      args.push(
        '-filter_complex',
        `${filterParts.join('')}concat=n=${clips.length}:v=1:a=1[outv][outa]`,
        '-map', '[outv]',
        '-map', '[outa]'
      );
    } else {
      // Build xfade filter chain for transitions
      const duration = transition.duration;
      let filterComplex = '';
      let lastVideo = '[0:v]';
      let lastAudio = '[0:a]';
      let offset = clips[0].duration - duration;

      for (let i = 1; i < clips.length; i++) {
        const outVideo = i === clips.length - 1 ? '[outv]' : `[v${i}]`;
        const outAudio = i === clips.length - 1 ? '[outa]' : `[a${i}]`;

        // Video transition (xfade)
        filterComplex += `${lastVideo}[${i}:v]xfade=transition=${transition.style}:duration=${duration}:offset=${offset}${outVideo};`;

        // Audio crossfade
        filterComplex += `${lastAudio}[${i}:a]acrossfade=d=${duration}${outAudio};`;

        lastVideo = outVideo;
        lastAudio = outAudio;

        if (i < clips.length - 1) {
          offset += clips[i].duration - duration;
        }
      }

      // Remove trailing semicolon
      filterComplex = filterComplex.slice(0, -1);

      args.push(
        '-filter_complex', filterComplex,
        '-map', '[outv]',
        '-map', '[outa]'
      );
    }

    // Output settings
    args.push(
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '192k',
      outputPath
    );

    return args;
  }

  // Copy/transcode single video
  async copyVideo(inputPath, outputPath, progressCallback) {
    return new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-i', inputPath,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '192k',
        outputPath
      ];

      this.currentProcess = spawn(this.ffmpegPath || 'ffmpeg', args);

      this.currentProcess.stderr.on('data', (data) => {
        // Progress parsing similar to merge
      });

      this.currentProcess.on('close', (code) => {
        this.currentProcess = null;
        if (code === 0) {
          resolve({ success: true, outputPath });
        } else {
          reject(new Error('FFmpeg copy failed'));
        }
      });

      this.currentProcess.on('error', reject);
    });
  }

  // Add background music to video
  async addMusic(videoPath, musicPath, outputPath, options, progressCallback) {
    return new Promise((resolve, reject) => {
      const { musicVolume = 70, originalVolume = 100, fade = true } = options;

      const musicVol = musicVolume / 100;
      const origVol = originalVolume / 100;

      let audioFilter = `[0:a]volume=${origVol}[a1];[1:a]volume=${musicVol}`;

      if (fade) {
        audioFilter += ',afade=t=in:d=2,afade=t=out:st=-2:d=2';
      }

      audioFilter += '[a2];[a1][a2]amix=inputs=2:duration=first[aout]';

      const args = [
        '-y',
        '-i', videoPath,
        '-i', musicPath,
        '-filter_complex', audioFilter,
        '-map', '0:v',
        '-map', '[aout]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        outputPath
      ];

      this.currentProcess = spawn(this.ffmpegPath || 'ffmpeg', args);

      this.currentProcess.on('close', (code) => {
        this.currentProcess = null;
        if (code === 0) {
          resolve({ success: true, outputPath });
        } else {
          reject(new Error('Failed to add music'));
        }
      });

      this.currentProcess.on('error', reject);
    });
  }

  // Burn captions into video
  async burnCaptions(videoPath, captionsPath, outputPath, progressCallback) {
    return new Promise((resolve, reject) => {
      // Escape path for FFmpeg filter
      const escapedCaptions = captionsPath.replace(/\\/g, '/').replace(/:/g, '\\:');

      const args = [
        '-y',
        '-i', videoPath,
        '-vf', `ass='${escapedCaptions}'`,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'copy',
        outputPath
      ];

      this.currentProcess = spawn(this.ffmpegPath || 'ffmpeg', args);

      this.currentProcess.on('close', (code) => {
        this.currentProcess = null;
        if (code === 0) {
          resolve({ success: true, outputPath });
        } else {
          reject(new Error('Failed to burn captions'));
        }
      });

      this.currentProcess.on('error', reject);
    });
  }

  // Change video resolution
  async changeResolution(videoPath, outputPath, resolution, quality) {
    return new Promise((resolve, reject) => {
      let scale = '';
      switch (resolution) {
        case '1080': scale = '1920:1080'; break;
        case '720': scale = '1280:720'; break;
        case '480': scale = '854:480'; break;
        default: scale = '-1:-1'; // Original
      }

      let crf = '23';
      switch (quality) {
        case 'low': crf = '28'; break;
        case 'medium': crf = '23'; break;
        case 'high': crf = '18'; break;
      }

      const args = [
        '-y',
        '-i', videoPath,
        '-vf', `scale=${scale}:force_original_aspect_ratio=decrease,pad=${scale}:(ow-iw)/2:(oh-ih)/2`,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', crf,
        '-c:a', 'copy',
        outputPath
      ];

      if (resolution === 'original') {
        // Skip scaling, just re-encode with quality setting
        args.splice(args.indexOf('-vf'), 2);
      }

      this.currentProcess = spawn(this.ffmpegPath || 'ffmpeg', args);

      this.currentProcess.on('close', (code) => {
        this.currentProcess = null;
        if (code === 0) {
          resolve({ success: true, outputPath });
        } else {
          reject(new Error('Failed to change resolution'));
        }
      });

      this.currentProcess.on('error', reject);
    });
  }

  // Cancel current operation
  cancel() {
    this.isCancelled = true;
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
    }
  }
}

module.exports = VideoEditor;
