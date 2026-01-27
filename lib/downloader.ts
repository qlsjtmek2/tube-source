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
  videoId?: string;
  url?: string;
  format: 'mp4' | 'mp3';
}

export interface DownloadEvent {
  type: 'progress' | 'title' | 'destination';
  value: string;
}

export function downloadVideo(options: DownloadOptions, onEvent: (event: DownloadEvent) => void): Promise<string> {
  return new Promise(async (resolve, reject) => {
    await initDownloadsDir();
    
    const url = options.url || `https://www.youtube.com/watch?v=${options.videoId}`;
    const filenameTemplate = `%({title})s.%({ext})s`;
    const outputPathTemplate = path.join(DOWNLOADS_DIR, filenameTemplate);

    const args = [
      url,
      '-o', outputPathTemplate,
      '--no-playlist',
      '--print', 'after_move:title', // Print title after download starts
    ];

    if (options.format === 'mp3') {
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
    } else {
      args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
    }

    // Progress tracking
    args.push('--newline', '--progress-template', '%(progress._percent_str)s');

    const child = spawn('yt-dlp', args);

    let finalPath = '';
    let capturedTitle = '';

    child.stdout.on('data', (data) => {
      const output = data.toString().trim();
      const lines = output.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Progress
        if (trimmedLine.includes('%')) {
          const progress = trimmedLine.match(/(\d+\.\d+)%/);
          if (progress) {
            onEvent({ type: 'progress', value: progress[0] });
          }
        }
        
        // Destination
        if (trimmedLine.includes('[download] Destination:')) {
          finalPath = trimmedLine.split('[download] Destination:')[1].trim();
          onEvent({ type: 'destination', value: finalPath });
        }
        if (trimmedLine.includes('[ExtractAudio] Destination:')) {
          finalPath = trimmedLine.split('[ExtractAudio] Destination:')[1].trim();
          onEvent({ type: 'destination', value: finalPath });
        }

        // Title (captured via --print)
        // yt-dlp outputs the printed title on its own line
        if (trimmedLine && !trimmedLine.startsWith('[') && !trimmedLine.includes('%') && !capturedTitle) {
          capturedTitle = trimmedLine;
          onEvent({ type: 'title', value: capturedTitle });
        }
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
