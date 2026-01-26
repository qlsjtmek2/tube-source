import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads');

export async function initDownloadsDir() {
  try {
    await fs.mkdir(DOWNLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create downloads directory:', error);
  }
}

export interface DownloadOptions {
  videoId: string;
  format: 'mp4' | 'mp3';
}

export function downloadVideo(options: DownloadOptions, onProgress: (progress: string) => void): Promise<string> {
  return new Promise(async (resolve, reject) => {
    await initDownloadsDir();
    
    const url = `https://www.youtube.com/watch?v=${options.videoId}`;
    const filenameTemplate = `%({title})s.%({ext})s`;
    const outputPathTemplate = path.join(DOWNLOADS_DIR, filenameTemplate);

    const args = [
      url,
      '-o', outputPathTemplate,
      '--no-playlist',
    ];

    if (options.format === 'mp3') {
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
    } else {
      // Best video + best audio merged into mp4
      args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
    }

    // Progress tracking
    args.push('--newline', '--progress-template', '%(progress._percent_str)s');

    const child = spawn('yt-dlp', args);

    let lastProgress = '';
    let finalPath = '';

    child.stdout.on('data', (data) => {
      const output = data.toString().trim();
      // yt-dlp might output progress like " 10.5%"
      if (output.includes('%')) {
        const progress = output.match(/(\d+\.\d+)%/);
        if (progress) {
          onProgress(progress[0]);
        }
      }
      
      // Try to capture the destination path
      if (output.includes('[download] Destination:')) {
        finalPath = output.split('[download] Destination:')[1].trim();
      }
      if (output.includes('[ExtractAudio] Destination:')) {
        finalPath = output.split('[ExtractAudio] Destination:')[1].trim();
      }
    });

    child.stderr.on('data', (data) => {
      console.error(`yt-dlp error: ${data}`);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(finalPath || 'Download complete');
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });
  });
}
