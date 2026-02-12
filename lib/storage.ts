import { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createBrowserClient } from './supabase';
import { EnrichedVideo } from './youtube';
import { AnalysisResult, AnalyzedVideo, ContextAnalysisResult } from './ai';

// 클라이언트가 주어지지 않으면 브라우저 클라이언트 생성 (Client Component용)
const getClient = (supabase?: SupabaseClient) => supabase || createBrowserClient();

export interface SavedChannel {
  channelId: string;
  channelTitle: string;
  thumbnail: string;
  addedAt: string;
  category?: string;
}

// ============= Channels Storage =============

export async function getSavedChannels(userId: string, supabaseClient?: SupabaseClient): Promise<SavedChannel[]> {
  const supabase = getClient(supabaseClient);
  const { data, error } = await supabase
    .from('saved_channels')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  if (error) {
    console.error('getSavedChannels Error:', error);
    return [];
  }

  return data.map(item => ({
    channelId: item.channel_id,
    channelTitle: item.channel_title,
    thumbnail: item.thumbnail,
    addedAt: item.added_at,
    category: item.category,
  }));
}

export async function saveChannel(userId: string, channel: SavedChannel, supabaseClient?: SupabaseClient) {
  const supabase = getClient(supabaseClient);
  
  const { error } = await supabase
    .from('saved_channels')
    .upsert({
      user_id: userId,
      channel_id: channel.channelId,
      channel_title: channel.channelTitle,
      thumbnail: channel.thumbnail,
      category: channel.category,
    }, { onConflict: 'user_id,channel_id' });

  if (error) {
    console.error('saveChannel Error:', error);
    throw error;
  }
  
  return getSavedChannels(userId, supabase);
}

export async function removeChannel(userId: string, channelId: string, supabaseClient?: SupabaseClient) {
  const supabase = getClient(supabaseClient);
  const { error } = await supabase
    .from('saved_channels')
    .delete()
    .eq('user_id', userId)
    .eq('channel_id', channelId);

  if (error) {
    console.error('removeChannel Error:', error);
    throw error;
  }
  
  return getSavedChannels(userId, supabase);
}

// ============= Analyzed Videos Storage =============

export async function getAnalyzedVideos(userId: string, supabaseClient?: SupabaseClient): Promise<AnalyzedVideo[]> {
  const supabase = getClient(supabaseClient);
  const { data, error } = await supabase
    .from('analysis_results')
    .select('*')
    .eq('user_id', userId)
    .order('analyzed_at', { ascending: false });

  if (error) {
    console.error('getAnalyzedVideos Error:', error);
    return [];
  }

  return data.map(item => ({
    type: item.type as 'single' | 'context',
    videoId: item.video_id,
    title: item.title,
    channelTitle: item.channel_title,
    channelId: item.channel_id,
    thumbnail: item.thumbnail,
    viewCount: item.metrics?.viewCount || 0,
    likeCount: item.metrics?.likeCount || 0,
    commentCount: item.metrics?.commentCount || 0,
    subscriberCount: item.metrics?.subscriberCount || 0,
    engagementRate: item.metrics?.engagementRate || 0,
    performanceRatio: item.metrics?.performanceRatio || 0,
    duration: item.metrics?.duration,
    transcript: item.metrics?.transcript,
    caption: item.metrics?.caption,
    creativeCommons: item.metrics?.creativeCommons,
    analysisResult: item.analysis_data,
    analyzedAt: item.analyzed_at,
  }));
}

export async function saveAnalyzedVideo(
  userId: string,
  video: EnrichedVideo,
  analysisResult: AnalysisResult,
  supabaseClient?: SupabaseClient
): Promise<AnalyzedVideo[]> {
  const supabase = getClient(supabaseClient);
  
  const { error } = await supabase
    .from('analysis_results')
    .upsert({
      user_id: userId,
      type: 'single',
      video_id: video.id,
      title: video.title,
      channel_title: video.channelTitle,
      channel_id: video.channelId,
      thumbnail: video.thumbnail,
      metrics: {
        viewCount: video.viewCount,
        likeCount: video.likeCount || 0,
        commentCount: video.commentCount || 0,
        subscriberCount: video.subscriberCount,
        engagementRate: video.engagementRate,
        performanceRatio: video.performanceRatio,
        duration: video.duration,
        transcript: video.subtitleText,
        caption: video.caption,
        creativeCommons: video.creativeCommons,
      },
      analysis_data: analysisResult,
    }, { onConflict: 'user_id,video_id' });

  if (error) {
    console.error('saveAnalyzedVideo Error:', error);
    throw error;
  }
  
  return getAnalyzedVideos(userId, supabase);
}

export async function saveContextAnalysis(
  userId: string,
  analysisResult: ContextAnalysisResult,
  sourceVideos: EnrichedVideo[],
  supabaseClient?: SupabaseClient
): Promise<AnalyzedVideo[]> {
  const supabase = getClient(supabaseClient);
  const reportId = `report-${Date.now()}`;
  const firstVideo = sourceVideos[0];
  
  const { error } = await supabase
    .from('analysis_results')
    .insert({
      user_id: userId,
      type: 'context',
      video_id: reportId,
      title: `Context Report: ${sourceVideos.length} Videos Analysis`,
      channel_title: `Based on ${firstVideo?.channelTitle || 'Unknown'} etc.`,
      channel_id: 'report',
      thumbnail: firstVideo?.thumbnail || '',
      metrics: {
        viewCount: sourceVideos.reduce((acc, v) => acc + v.viewCount, 0),
        likeCount: sourceVideos.reduce((acc, v) => acc + (v.likeCount || 0), 0),
        commentCount: sourceVideos.reduce((acc, v) => acc + (v.commentCount || 0), 0),
      },
      analysis_data: analysisResult,
    });

  if (error) {
    console.error('saveContextAnalysis Error:', error);
    throw error;
  }
  
  return getAnalyzedVideos(userId, supabase);
}

export async function deleteAnalyzedVideo(userId: string, videoId: string, supabaseClient?: SupabaseClient): Promise<AnalyzedVideo[]> {
  const supabase = getClient(supabaseClient);
  const { error } = await supabase
    .from('analysis_results')
    .delete()
    .eq('user_id', userId)
    .eq('video_id', videoId);

  if (error) {
    console.error('deleteAnalyzedVideo Error:', error);
    throw error;
  }
  
  return getAnalyzedVideos(userId, supabase);
}

