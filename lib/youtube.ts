import { google, youtube_v3 } from 'googleapis';
import { extractSubtitlesBatch, SubtitleData } from './subtitles';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

export interface SavedChannel {
  channelId: string;
  channelTitle: string;
  thumbnail: string;
  addedAt: string;
}

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
  channelId?: string; // 특정 채널 ID로 필터링
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
        q: filters.q || '', // Ensure q is at least an empty string
        type: ['video'],
        channelId: filters.channelId, 
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

export async function searchChannels(query: string): Promise<SavedChannel[]> {
  try {
    const res = await youtube.search.list({
      part: ['snippet'],
      q: query,
      type: ['channel'],
      maxResults: 5,
    });

    return (res.data.items || []).map(item => ({
      channelId: item.snippet?.channelId || '',
      channelTitle: item.snippet?.title || '',
      thumbnail: item.snippet?.thumbnails?.default?.url || '',
      addedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Channel Search Error:', error);
    return [];
  }
}

export interface ChannelDetails {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  customUrl?: string;
  country?: string;
  publishedAt: string;
  
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  
  lastUploadAt: string;
  averageLikes: number; // Estimated from sample
  
  keywords: string[];
  
  topVideos: EnrichedVideo[]; // Keep for compatibility if needed, or just popular ones
  recentVideos: { title: string; viewCount: number; publishedAt: string }[];
}

export async function getChannelDetails(channelId: string): Promise<ChannelDetails> {
  try {
    // 1. Get Channel Basic Info (Removed brandingSettings to skip banner)
    const channelRes = await youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: [channelId],
    });

    const channel = channelRes.data.items?.[0];
    if (!channel) throw new Error('Channel not found');

    // 2. Get Top 3 Popular Videos
    const popularSearch = await youtube.search.list({
      part: ['id'],
      channelId: channelId,
      order: 'viewCount',
      type: ['video'],
      maxResults: 3,
    });
    
    // 3. Get Recent 10 Videos (for graph and last upload date)
    const recentSearch = await youtube.search.list({
      part: ['id', 'snippet'],
      channelId: channelId,
      order: 'date',
      type: ['video'],
      maxResults: 10,
    });

    const popularIds = popularSearch.data.items?.map(i => i.id?.videoId).filter(Boolean) as string[] || [];
    const recentItems = recentSearch.data.items || [];
    const recentIds = recentItems.map(i => i.id?.videoId).filter(Boolean) as string[];
    
    const allVideoIds = [...new Set([...popularIds, ...recentIds].filter(Boolean) as string[])];

    // 4. Get Video Details
    let videoItems: youtube_v3.Schema$Video[] = [];
    if (allVideoIds.length > 0) {
      const videoRes = await youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: allVideoIds,
      });
      videoItems = videoRes.data.items || [];
    }

    // Map to EnrichedVideo for Top 3 Popular
    const topVideos = videoItems
      .filter(v => popularIds.includes(v.id!))
      .map(v => ({
        id: v.id!,
        title: v.snippet?.title || '',
        description: v.snippet?.description || '',
        thumbnail: v.snippet?.thumbnails?.medium?.url || '',
        publishedAt: v.snippet?.publishedAt || '',
        channelId: channel.id!,
        channelTitle: channel.snippet?.title || '',
        channelThumbnail: channel.snippet?.thumbnails?.default?.url || '',
        viewCount: Number(v.statistics?.viewCount) || 0,
        likeCount: Number(v.statistics?.likeCount) || 0,
        commentCount: Number(v.statistics?.commentCount) || 0,
        duration: v.contentDetails?.duration || '',
        caption: v.contentDetails?.caption === 'true',
        subscriberCount: Number(channel.statistics?.subscriberCount) || 0,
        channelVideoCount: Number(channel.statistics?.videoCount) || 0,
        channelViewCount: Number(channel.statistics?.viewCount) || 0,
        engagementRate: 0, 
        performanceRatio: 0, 
      })).slice(0, 3); // Ensure max 3
      
    // Map Recent Videos for Graph
    // We need to map from 'videoItems' to get accurate viewCounts because search result statistics might be missing or limited
    const recentVideos = recentIds.map(id => {
      const v = videoItems.find(item => item.id === id);
      return {
        title: v?.snippet?.title || 'Unknown',
        viewCount: Number(v?.statistics?.viewCount) || 0,
        publishedAt: v?.snippet?.publishedAt || '',
      };
    }).filter(v => v.publishedAt); // Filter out any failed lookups

    // Calculate simple avg likes from the sample (using all fetched videos)
    const totalLikes = videoItems.reduce((sum, v) => sum + (Number(v.statistics?.likeCount) || 0), 0);
    const averageLikes = videoItems.length > 0 ? Math.floor(totalLikes / videoItems.length) : 0;

    const lastUploadAt = recentItems[0]?.snippet?.publishedAt || '';

    return {
      id: channel.id!,
      title: channel.snippet?.title || '',
      description: channel.snippet?.description || '',
      thumbnail: channel.snippet?.thumbnails?.medium?.url || '',
      // Banner removed
      customUrl: channel.snippet?.customUrl || '',
      country: channel.snippet?.country || undefined,
      publishedAt: channel.snippet?.publishedAt || '',
      
      subscriberCount: Number(channel.statistics?.subscriberCount) || 0,
      videoCount: Number(channel.statistics?.videoCount) || 0,
      viewCount: Number(channel.statistics?.viewCount) || 0,
      
      lastUploadAt,
      averageLikes,
      
      keywords: [], // Keywords often come from brandingSettings which we removed. If needed, we'd need brandingSettings back but ignore banner.
      // Actually keywords are in brandingSettings.channel.keywords. 
      // If user wants "no channel art", I can still fetch brandingSettings but just NOT return banner.
      // Let's re-add brandingSettings to fetch keywords but strictly omit banner from return object.
      
      topVideos,
      recentVideos,
    };

  } catch (error) {
    console.error('Error fetching channel details:', error);
    throw error;
  }
}