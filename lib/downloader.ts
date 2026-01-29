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

function cleanVideoUrl(url: string): string {
  // Remove trailing parentheses and other invalid characters
  let cleanUrl = url.replace(/[)\]}>]+$/, '');

  // YouTube Patterns
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of youtubePatterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      return `https://www.youtube.com/watch?v=${match[1]}`;
    }
  }

  // TikTok Patterns
  // Supports:
  // - https://www.tiktok.com/@user/video/1234567890123456789
  // - https://vm.tiktok.com/ZM8...
  // - https://vt.tiktok.com/ZM8...
  const tiktokPatterns = [
    /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
    /(?:vm|vt)\.tiktok\.com\/([\w-]+)/,
  ];

  for (const pattern of tiktokPatterns) {
    if (cleanUrl.match(pattern)) {
      return cleanUrl; // TikTok URLs are usually fine as is, just return the cleaned string
    }
  }

  return cleanUrl;
}

export function downloadVideo(options: DownloadOptions, onEvent: (event: DownloadEvent) => void): Promise<string> {
  return new Promise(async (resolve, reject) => {
    await initDownloadsDir();

    const rawUrl = options.url || `https://www.youtube.com/watch?v=${options.videoId}`;
    const url = cleanVideoUrl(rawUrl);
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
      // H.264(avc1) 코덱 우선 - Premiere Pro 호환성 보장
      // AV1(av01)은 Premiere Pro에서 지원하지 않음
      args.push('-f', 'bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best');
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
