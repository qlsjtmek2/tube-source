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

function cleanYouTubeUrl(url: string): string {
  // Remove trailing parentheses and other invalid characters
  let cleanUrl = url.replace(/[)\]}>]+$/, '');

  // Extract video ID and rebuild clean URL
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      return `https://www.youtube.com/watch?v=${match[1]}`;
    }
  }

  return cleanUrl;
}

export function downloadVideo(options: DownloadOptions, onEvent: (event: DownloadEvent) => void): Promise<string> {
  return new Promise(async (resolve, reject) => {
    await initDownloadsDir();

    const rawUrl = options.url || `https://www.youtube.com/watch?v=${options.videoId}`;
    const url = cleanYouTubeUrl(rawUrl);
    const filenameTemplate = '%(title)s.%(ext)s';
    const outputPathTemplate = path.join(DOWNLOADS_DIR, filenameTemplate);

    console.log(`[downloader] Starting download: ${url}`);
    console.log(`[downloader] Output path: ${outputPathTemplate}`);

    const args = [
      url,
      '-o', outputPathTemplate,
      '--no-playlist',
      '--newline',
    ];

    if (options.format === 'mp3') {
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
    } else {
      args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
    }

    console.log(`[downloader] Command: yt-dlp ${args.join(' ')}`);

    const child = spawn('yt-dlp', args);

    let finalPath = '';

    child.stdout.on('data', (data) => {
      const output = data.toString();
      const lines = output.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        console.log(`[yt-dlp stdout] ${trimmedLine}`);

        // Progress percentage
        const progressMatch = trimmedLine.match(/(\d+\.?\d*)%/);
        if (progressMatch) {
          onEvent({ type: 'progress', value: `${progressMatch[1]}%` });
        }

        // Destination paths
        if (trimmedLine.includes('[download] Destination:')) {
          finalPath = trimmedLine.split('[download] Destination:')[1].trim();
          onEvent({ type: 'destination', value: finalPath });
          // Extract title from filename
          const title = path.basename(finalPath).replace(/\.[^.]+$/, '');
          onEvent({ type: 'title', value: title });
        }
        if (trimmedLine.includes('[ExtractAudio] Destination:')) {
          finalPath = trimmedLine.split('[ExtractAudio] Destination:')[1].trim();
          onEvent({ type: 'destination', value: finalPath });
        }
      }
    });

    child.stderr.on('data', (data) => {
      console.error(`[yt-dlp stderr] ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
      console.log(`[downloader] yt-dlp exited with code ${code}`);
      if (code === 0) {
        resolve(finalPath || 'Download complete');
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      console.error(`[downloader] spawn error:`, error);
      reject(error);
    });
  });
}
