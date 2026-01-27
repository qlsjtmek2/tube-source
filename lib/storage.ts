import fs from 'fs/promises';
import path from 'path';
import { EnrichedVideo } from './youtube';
import { AnalysisResult, AnalyzedVideo, ContextAnalysisResult } from './ai';

const DATA_DIR = path.join(process.cwd(), 'data');
const CHANNELS_FILE = path.join(DATA_DIR, 'channels.json');
const ANALYZED_VIDEOS_FILE = path.join(DATA_DIR, 'analyzed-videos.json');

// Simple lock mechanism to prevent concurrent writes
class Lock {
  private promise: Promise<void> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let release: () => void;
    const nextPromise = new Promise<void>((resolve) => {
      release = resolve;
    });
    const currentPromise = this.promise;
    this.promise = currentPromise.then(() => nextPromise);
    await currentPromise;
    return release!;
  }
}

const storageLock = new Lock();

// 데이터 폴더 및 파일 초기화
async function initStorage() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });

    // channels.json 초기화
    try {
      await fs.access(CHANNELS_FILE);
    } catch {
      await fs.writeFile(CHANNELS_FILE, JSON.stringify([], null, 2));
    }

    // analyzed-videos.json 초기화
    try {
      await fs.access(ANALYZED_VIDEOS_FILE);
    } catch {
      await fs.writeFile(ANALYZED_VIDEOS_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error('Storage Init Error:', error);
  }
}

export interface SavedChannel {
  channelId: string;
  channelTitle: string;
  thumbnail: string;
  addedAt: string;
}

export async function getSavedChannels(): Promise<SavedChannel[]> {
  await initStorage();
  const data = await fs.readFile(CHANNELS_FILE, 'utf-8');
  return JSON.parse(data);
}

export async function saveChannel(channel: SavedChannel) {
  const release = await storageLock.acquire();
  try {
    await initStorage();
    const data = await fs.readFile(CHANNELS_FILE, 'utf-8');
    const channels: SavedChannel[] = JSON.parse(data);
    
    if (channels.find(c => c.channelId === channel.channelId)) {
      return channels; 
    }
    
    const updated = [...channels, channel];
    await fs.writeFile(CHANNELS_FILE, JSON.stringify(updated, null, 2));
    return updated;
  } finally {
    release();
  }
}

export async function removeChannel(channelId: string) {
  const release = await storageLock.acquire();
  try {
    const data = await fs.readFile(CHANNELS_FILE, 'utf-8');
    const channels: SavedChannel[] = JSON.parse(data);
    const updated = channels.filter(c => c.channelId !== channelId);
    await fs.writeFile(CHANNELS_FILE, JSON.stringify(updated, null, 2));
    return updated;
  } finally {
    release();
  }
}

// ============= Analyzed Videos Storage =============

// 모든 분석된 영상 목록 조회 (최근 분석 순)
export async function getAnalyzedVideos(): Promise<AnalyzedVideo[]> {
  await initStorage();
  const data = await fs.readFile(ANALYZED_VIDEOS_FILE, 'utf-8');
  const videos: AnalyzedVideo[] = JSON.parse(data);

  // 중복 제거: videoId가 같은 것 중 가장 최근 것만 유지
  const uniqueVideos = videos.reduce((acc, video) => {
    if (!video.videoId) return acc; // videoId 없으면 제외

    const existing = acc.find(v => v.videoId === video.videoId);
    if (!existing) {
      acc.push(video);
    } else {
      // 더 최근 것으로 교체
      const existingDate = new Date(existing.analyzedAt).getTime();
      const currentDate = new Date(video.analyzedAt).getTime();
      if (currentDate > existingDate) {
        const index = acc.indexOf(existing);
        acc[index] = video;
      }
    }
    return acc;
  }, [] as AnalyzedVideo[]);

  // 최근 분석 순으로 정렬
  return uniqueVideos.sort((a, b) =>
    new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
  );
}

// 특정 영상의 분석 결과 조회
export async function getAnalysis(videoId: string): Promise<AnalyzedVideo | null> {
  const videos = await getAnalyzedVideos();
  return videos.find(v => v.videoId === videoId) || null;
}

// 분석 결과 저장 또는 업데이트
export async function saveAnalyzedVideo(
  video: EnrichedVideo,
  analysisResult: AnalysisResult
): Promise<AnalyzedVideo[]> {
  const release = await storageLock.acquire();
  try {
    await initStorage();
    const data = await fs.readFile(ANALYZED_VIDEOS_FILE, 'utf-8');
    const videos: AnalyzedVideo[] = JSON.parse(data);

    // 중복 제거 (같은 videoId가 있으면 기존 항목 제거)
    const filtered = videos.filter(v => v.videoId !== video.id);

    // 새로운 분석 결과 추가
    const analyzedVideo: AnalyzedVideo = {
      type: 'single',
      videoId: video.id,
      title: video.title,
      channelTitle: video.channelTitle,
      channelId: video.channelId,
      thumbnail: video.thumbnail,
      viewCount: video.viewCount,
      likeCount: video.likeCount || 0,
      commentCount: video.commentCount || 0,
      subscriberCount: video.subscriberCount,
      engagementRate: video.engagementRate,
      performanceRatio: video.performanceRatio,
      analysisResult,
      analyzedAt: new Date().toISOString(),
    };

    const updated = [analyzedVideo, ...filtered];
    await fs.writeFile(ANALYZED_VIDEOS_FILE, JSON.stringify(updated, null, 2));
    return updated;
  } finally {
    release();
  }
}

export async function saveContextAnalysis(
  analysisResult: ContextAnalysisResult,
  sourceVideos: EnrichedVideo[]
): Promise<AnalyzedVideo[]> {
  const release = await storageLock.acquire();
  try {
    await initStorage();
    const data = await fs.readFile(ANALYZED_VIDEOS_FILE, 'utf-8');
    const videos: AnalyzedVideo[] = JSON.parse(data);

    const reportId = `report-${Date.now()}`;
    const firstVideo = sourceVideos[0];
    
    // Create a summary 'video' object representing the report
    const analyzedReport: AnalyzedVideo = {
      type: 'context',
      videoId: reportId,
      title: `Context Report: ${sourceVideos.length} Videos Analysis`,
      channelTitle: `Based on ${sourceVideos[0]?.channelTitle || 'Unknown'} etc.`,
      channelId: 'report',
      thumbnail: firstVideo?.thumbnail || '',
      viewCount: sourceVideos.reduce((acc, v) => acc + v.viewCount, 0),
      likeCount: sourceVideos.reduce((acc, v) => acc + (v.likeCount || 0), 0),
      commentCount: sourceVideos.reduce((acc, v) => acc + (v.commentCount || 0), 0),
      subscriberCount: 0,
      engagementRate: 0,
      performanceRatio: 0,
      analysisResult,
      analyzedAt: new Date().toISOString(),
    };

    const updated = [analyzedReport, ...videos];
    await fs.writeFile(ANALYZED_VIDEOS_FILE, JSON.stringify(updated, null, 2));
    return updated;
  } finally {
    release();
  }
}

// 분석 결과 삭제
export async function deleteAnalyzedVideo(videoId: string): Promise<AnalyzedVideo[]> {
  const release = await storageLock.acquire();
  try {
    const data = await fs.readFile(ANALYZED_VIDEOS_FILE, 'utf-8');
    const videos: AnalyzedVideo[] = JSON.parse(data);
    const updated = videos.filter(v => v.videoId !== videoId);
    await fs.writeFile(ANALYZED_VIDEOS_FILE, JSON.stringify(updated, null, 2));
    return updated;
  } finally {
    release();
  }
}
