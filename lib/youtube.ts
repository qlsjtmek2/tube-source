import { google, youtube_v3 } from 'googleapis';
import { extractSubtitlesBatch, SubtitleData } from './subtitles';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

export interface VideoSearchFilters {
  q: string;
  publishedAfter?: string;
  publishedBefore?: string;
  regionCode?: string;
  videoDuration?: 'any' | 'long' | 'medium' | 'short';
  order?: 'date' | 'rating' | 'relevance' | 'title' | 'videoCount' | 'viewCount';
  creativeCommons?: boolean;
  maxResults?: number; // 1-100 (paginated internally)
  fetchSubtitles?: boolean; // 자막 수집 여부 (기본값: true)
}

export interface EnrichedVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  channelThumbnail: string; // Channel profile picture

  // Video Stats
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
  caption: boolean; // has caption?

  // Channel Stats
  subscriberCount: number;
  channelVideoCount: number;
  channelViewCount: number; // Total channel views

  // Derived Metrics
  engagementRate: number; // ((Likes + Comments) / Views) * 100
  performanceRatio: number; // (Video Views / Subscriber Count) * 100 (Simplified proxy for contribution)

  // Subtitles
  subtitleText?: string; // 자막 텍스트 (없으면 undefined)
  subtitleLanguage?: string; // 자막 언어 (예: 'ko')
}

export async function searchVideos(filters: VideoSearchFilters): Promise<EnrichedVideo[]> {
  try {
    const targetMaxResults = filters.maxResults && filters.maxResults >= 1 && filters.maxResults <= 100
      ? filters.maxResults
      : 50;

    // YouTube API max is 50 per call, so we need to paginate for 51-100
    const allItems: any[] = [];
    let pageToken: string | undefined = undefined;
    const perPage = 50;

    while (allItems.length < targetMaxResults) {
      const remaining = targetMaxResults - allItems.length;
      const currentMaxResults = Math.min(remaining, perPage);

      const searchRes = await youtube.search.list({
        part: ['snippet'],
        q: filters.q,
        type: ['video'],
        publishedAfter: filters.publishedAfter,
        publishedBefore: filters.publishedBefore,
        regionCode: filters.regionCode,
        videoDuration: filters.videoDuration,
        order: filters.order,
        videoLicense: filters.creativeCommons ? 'creativeCommon' : 'any',
        maxResults: currentMaxResults,
        pageToken,
      });

      const items = searchRes.data.items || [];
      allItems.push(...items);

      console.log(`[YouTube Search] Fetched ${items.length} items (total: ${allItems.length}/${targetMaxResults})`);

      // Check if we have more pages
      pageToken = searchRes.data.nextPageToken as string | undefined;
      if (!pageToken || items.length === 0) break;
    }

    if (allItems.length === 0) return [];

    // Remove duplicate video IDs (can happen with pagination)
    const videoIds = [...new Set(allItems.map(item => item.id?.videoId).filter(Boolean) as string[])];
    const channelIds = [...new Set(allItems.map(item => item.snippet?.channelId).filter(Boolean) as string[])];

    console.log(`[YouTube Search] Extracted Video IDs: ${videoIds.length} (deduplicated)`);

    // 2. Fetch Video Details (Stats, Duration, ContentDetails)
    // YouTube API allows max 50 ids per call. Handle chunking if > 50.
    const allVideoItems: youtube_v3.Schema$Video[] = [];
    const chunkSize = 50;

    for (let i = 0; i < videoIds.length; i += chunkSize) {
      const chunk = videoIds.slice(i, i + chunkSize);
      try {
        const videoRes = await youtube.videos.list({
          part: ['snippet', 'contentDetails', 'statistics'],
          id: chunk,
        });
        const items = videoRes.data.items || [];
        allVideoItems.push(...items);
      } catch (e) {
        console.error('[YouTube Search] Video fetch error:', e);
      }
    }

    console.log(`[YouTube Search] Video Details found: ${allVideoItems.length}`);

    // 3. Fetch Channel Details (Stats)
    // YouTube API allows max 50 ids per call. Handle chunking if > 50.
    let channelsMap: Record<string, youtube_v3.Schema$Channel> = {};
    if (channelIds.length > 0) {
      // Chunk channel IDs into batches of 50
      for (let i = 0; i < channelIds.length; i += chunkSize) {
        const chunk = channelIds.slice(i, i + chunkSize);
        try {
          const channelRes = await youtube.channels.list({
             part: ['statistics', 'snippet'],
             id: chunk,
          });
          (channelRes.data.items || []).forEach(channel => {
            if (channel.id) channelsMap[channel.id] = channel;
          });
        } catch (e) {
          console.error('[YouTube Search] Channel fetch error:', e);
        }
      }
    }

    console.log(`[YouTube Search] Channels found: ${Object.keys(channelsMap).length}`);

    // 4. Fetch Subtitles (if enabled)
    let subtitlesMap = new Map<string, SubtitleData>();
    if (filters.fetchSubtitles !== false) { // 기본값 true
      console.log(`[YouTube Search] Fetching subtitles for ${videoIds.length} videos...`);
      subtitlesMap = await extractSubtitlesBatch(videoIds, 'ko');
      console.log(`[YouTube Search] Subtitles fetched: ${subtitlesMap.size}/${videoIds.length}`);
    }

    // 5. Merge Data
    const enrichedVideos: EnrichedVideo[] = [];

    const videoItems = allVideoItems;
    
    for (const video of videoItems) {
      if (!video.id || !video.snippet || !video.statistics) continue;
      
      const channelId = video.snippet.channelId!;
      const channel = channelsMap[channelId];
      
      const viewCount = Number(video.statistics.viewCount) || 0;
      const likeCount = Number(video.statistics.likeCount) || 0;
      const commentCount = Number(video.statistics.commentCount) || 0;
      const subscriberCount = Number(channel?.statistics?.subscriberCount) || 1; // Avoid div by zero
      
      const engagementRate = viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;
      const performanceRatio = (viewCount / subscriberCount) * 100; // Views relative to subs
      
      enrichedVideos.push({
        id: video.id,
        title: video.snippet.title || '',
        description: video.snippet.description || '',
        thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || '',
        publishedAt: video.snippet.publishedAt || '',
        channelId: channelId,
        channelTitle: video.snippet.channelTitle || '',
        channelThumbnail: channel?.snippet?.thumbnails?.default?.url || channel?.snippet?.thumbnails?.medium?.url || '',

        viewCount,
        likeCount,
        commentCount,
        duration: video.contentDetails?.duration || '',
        caption: video.contentDetails?.caption === 'true',

        subscriberCount,
        channelVideoCount: Number(channel?.statistics?.videoCount) || 0,
        channelViewCount: Number(channel?.statistics?.viewCount) || 0,

        engagementRate: Number(engagementRate.toFixed(2)),
        performanceRatio: Number(performanceRatio.toFixed(2)),

        subtitleText: subtitlesMap.get(video.id)?.text,
        subtitleLanguage: subtitlesMap.get(video.id)?.language,
      });
    }
    
    return enrichedVideos;

  } catch (error) {
    console.error('YouTube API Error:', error);
    throw error;
  }
}