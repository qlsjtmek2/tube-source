import { google, youtube_v3 } from 'googleapis';

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
}

export interface EnrichedVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  
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
}

export async function searchVideos(filters: VideoSearchFilters): Promise<EnrichedVideo[]> {
  try {
    // 1. Search for video IDs
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
      maxResults: 50,
    });

    console.log(`[YouTube Search] Query: ${filters.q}, Items found: ${searchRes.data.items?.length}`);

    const items = searchRes.data.items || [];
    if (items.length === 0) return [];

    const videoIds = items.map(item => item.id?.videoId).filter(Boolean) as string[];
    const channelIds = [...new Set(items.map(item => item.snippet?.channelId).filter(Boolean) as string[])];

    console.log(`[YouTube Search] Extracted Video IDs: ${videoIds.length}`);

    // 2. Fetch Video Details (Stats, Duration, ContentDetails)
    // join(',') is safer for googleapis
    const videoRes = await youtube.videos.list({
      part: ['snippet', 'contentDetails', 'statistics'],
      id: videoIds, 
    });
    
    console.log(`[YouTube Search] Video Details found: ${videoRes.data.items?.length}`);
    
    // 3. Fetch Channel Details (Stats)
    // YouTube API allows max 50 ids per call. Handle chunking if > 50.
    let channelsMap: Record<string, youtube_v3.Schema$Channel> = {};
    if (channelIds.length > 0) {
      // Chunk channel IDs into batches of 50
      const chunkSize = 50;
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

    // 4. Merge Data
    const enrichedVideos: EnrichedVideo[] = [];
    
    const videoItems = videoRes.data.items || [];
    
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
      });
    }
    
    return enrichedVideos;

  } catch (error) {
    console.error('YouTube API Error:', error);
    throw error;
  }
}