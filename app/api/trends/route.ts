import { NextRequest, NextResponse } from 'next/server';
import { google, youtube_v3 } from 'googleapis';
import { EnrichedVideo } from '@/lib/youtube';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const regionCode = searchParams.get('regionCode') || 'KR';
  const videoCategoryId = searchParams.get('videoCategoryId') || '';

  try {
    const params: any = {
      part: ['snippet', 'contentDetails', 'statistics'],
      chart: 'mostPopular',
      regionCode: regionCode,
      maxResults: 24,
    };

    if (videoCategoryId && videoCategoryId !== '0') {
      params.videoCategoryId = videoCategoryId;
    }

    const videoRes = await youtube.videos.list(params);
    const videoItems = videoRes.data.items || [];
    
    if (videoItems.length === 0) {
      return NextResponse.json({ videos: [] });
    }

    // Fetch Channel Details for enrichment
    const channelIds = [...new Set(videoItems.map(item => item.snippet?.channelId).filter(Boolean) as string[])];
    
    let channelsMap: Record<string, youtube_v3.Schema$Channel> = {};
    if (channelIds.length > 0) {
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
          console.error('[YouTube Trends] Channel fetch error:', e);
        }
      }
    }

    // Enrichment Logic (Same as search)
    const enrichedVideos: EnrichedVideo[] = videoItems.map(video => {
       const channelId = video.snippet?.channelId!;
       const channel = channelsMap[channelId];
       
       const viewCount = Number(video.statistics?.viewCount) || 0;
       const likeCount = Number(video.statistics?.likeCount) || 0;
       const commentCount = Number(video.statistics?.commentCount) || 0;
       const subscriberCount = Number(channel?.statistics?.subscriberCount) || 1;
       
       const engagementRate = viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;
       const performanceRatio = (viewCount / subscriberCount) * 100;

       return {
        id: video.id!,
        title: video.snippet?.title || '',
        description: video.snippet?.description || '',
        thumbnail: video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || '',
        publishedAt: video.snippet?.publishedAt || '',
        channelId: channelId,
        channelTitle: video.snippet?.channelTitle || '',
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
    });

    return NextResponse.json({ videos: enrichedVideos });
  } catch (error: any) {
    console.error('Trends API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
