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
  minSubscribers?: number; // 최소 구독자 수
  maxSubscribers?: number; // 최대 구독자 수
  minPerformanceRatio?: number; // 최소 성과도 (%)
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

export interface YouTubeComment {
  id: string;
  authorName: string;
  authorThumbnail: string;
  text: string;
  likeCount: number;
  publishedAt: string;
}

export async function searchVideos(filters: VideoSearchFilters): Promise<EnrichedVideo[]> {
  try {
    const targetMaxResults = filters.maxResults && filters.maxResults >= 1 && filters.maxResults <= 100
      ? filters.maxResults
      : 50;

    let pageToken: string | undefined = undefined;
    const enrichedVideos: EnrichedVideo[] = [];
    const MAX_PAGES = 5; // Prevent infinite loops and excessive quota usage
    let pageCount = 0;

    // Loop until we have enough videos or reach the page limit
    while (enrichedVideos.length < targetMaxResults && pageCount < MAX_PAGES) {
      pageCount++;
      const remainingNeeded = targetMaxResults - enrichedVideos.length;
      // Always fetch 50 to maximize chance of finding valid videos after filtering
      // But don't fetch more than 50 (API limit)
      const fetchCount = 50; 

      console.log(`[YouTube Search] Page ${pageCount}: Fetching ${fetchCount} items... (Needed: ${remainingNeeded})`);

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
        maxResults: fetchCount,
        pageToken,
      });

      const items = searchRes.data.items || [];
      if (items.length === 0) break; // No more items found

      // Deduplicate IDs within this batch
      const videoIds = [...new Set(items.map(item => item.id?.videoId).filter(Boolean) as string[])];
      const channelIds = [...new Set(items.map(item => item.snippet?.channelId).filter(Boolean) as string[])];

      if (videoIds.length === 0) {
         pageToken = searchRes.data.nextPageToken as string | undefined;
         if (!pageToken) break;
         continue;
      }

      // Fetch Details (Videos & Channels) for filtering
      const [videoRes, channelRes] = await Promise.all([
        youtube.videos.list({
          part: ['snippet', 'contentDetails', 'statistics'],
          id: videoIds,
        }),
        youtube.channels.list({
          part: ['statistics', 'snippet'],
          id: channelIds,
        })
      ]);

      const videoItems = videoRes.data.items || [];
      const channelItems = channelRes.data.items || [];
      
      const channelsMap: Record<string, youtube_v3.Schema$Channel> = {};
      channelItems.forEach(channel => {
        if (channel.id) channelsMap[channel.id] = channel;
      });

      // Filter and Enrich
      const batchEnriched: EnrichedVideo[] = [];
      const validVideoIdsForSubtitles: string[] = [];

      for (const video of videoItems) {
        if (!video.id || !video.snippet || !video.statistics) continue;
        
        const channelId = video.snippet.channelId!;
        const channel = channelsMap[channelId];
        
        const viewCount = Number(video.statistics.viewCount) || 0;
        const likeCount = Number(video.statistics.likeCount) || 0;
        const commentCount = Number(video.statistics.commentCount) || 0;
        const subscriberCount = Number(channel?.statistics?.subscriberCount) || 0; // 0 if hidden
        
        const engagementRate = viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;
        // Avoid division by zero
        const performanceRatio = subscriberCount > 0 ? (viewCount / subscriberCount) * 100 : 0;
        
        // --- MEMORY FILTERING ---
        // 1. Subscriber Count Filter
        if (filters.minSubscribers !== undefined && subscriberCount < filters.minSubscribers) continue;
        if (filters.maxSubscribers !== undefined && subscriberCount > filters.maxSubscribers) continue;

        // 2. Performance Ratio Filter
        if (filters.minPerformanceRatio !== undefined && performanceRatio < filters.minPerformanceRatio) continue;
        // ------------------------

        const enriched: EnrichedVideo = {
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
        };

        batchEnriched.push(enriched);
        validVideoIdsForSubtitles.push(video.id);
        
        // Optimization: Stop processing this batch if we reached global target
        if (enrichedVideos.length + batchEnriched.length >= targetMaxResults) break;
      }

      // Fetch Subtitles ONLY for valid videos (to save time/resources)
      if (validVideoIdsForSubtitles.length > 0 && filters.fetchSubtitles !== false) {
        console.log(`[YouTube Search] Fetching subtitles for ${validVideoIdsForSubtitles.length} valid videos...`);
        const subtitlesMap = await extractSubtitlesBatch(validVideoIdsForSubtitles, 'ko');
        
        // Attach subtitles
        batchEnriched.forEach(v => {
          v.subtitleText = subtitlesMap.get(v.id)?.text;
          v.subtitleLanguage = subtitlesMap.get(v.id)?.language;
        });
      }

      enrichedVideos.push(...batchEnriched);
      console.log(`[YouTube Search] Added ${batchEnriched.length} valid videos. Total: ${enrichedVideos.length}/${targetMaxResults}`);

      // Check next page
      pageToken = searchRes.data.nextPageToken as string | undefined;
      if (!pageToken) break;
    }
    
    // Final deduplication just in case
    const uniqueVideos = Array.from(new Map(enrichedVideos.map(item => [item.id, item])).values());
    return uniqueVideos;

  } catch (error) {
    console.error('YouTube API Error:', error);
    throw error;
  }
}

export async function getTopComments(videoId: string, maxResults: number = 20): Promise<YouTubeComment[]> {
  try {
    const res = await youtube.commentThreads.list({
      part: ['snippet'],
      videoId: videoId,
      order: 'relevance',
      maxResults: maxResults,
    });

    return (res.data.items || []).map(item => {
      const comment = item.snippet?.topLevelComment?.snippet;
      return {
        id: item.id!,
        authorName: comment?.authorDisplayName || 'Unknown',
        authorThumbnail: comment?.authorProfileImageUrl || '',
        text: comment?.textDisplay || '',
        likeCount: Number(comment?.likeCount) || 0,
        publishedAt: comment?.publishedAt || '',
      };
    });
  } catch (error) {
    console.error(`[YouTube API] Error fetching comments for ${videoId}:`, error);
    return [];
  }
}