import { NextRequest, NextResponse } from 'next/server';
import {
  getAnalyzedVideos,
  saveAnalyzedVideo,
  saveContextAnalysis,
  deleteAnalyzedVideo
} from '@/lib/storage';
import { EnrichedVideo } from '@/lib/youtube';
import { AnalysisResult, ContextAnalysisResult } from '@/lib/ai';
import { createClient } from '@/lib/supabase-server';

// GET: 분석된 영상 조회
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');

    const videos = await getAnalyzedVideos(user.id, supabase);

    if (videoId) {
      const analysis = videos.find(v => v.videoId === videoId) || null;
      return NextResponse.json({ analysis });
    } else {
      return NextResponse.json({ videos });
    }
  } catch (error: any) {
    console.error('GET /api/analyzed-videos error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analyzed videos' },
      { status: 500 }
    );
  }
}

// POST: 분석 결과 저장 또는 삭제
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, videoId, video, videos, analysisResult } = body;

    if (action === 'save') {
      if (!video || !analysisResult) {
        return NextResponse.json(
          { error: 'Missing video or analysisResult' },
          { status: 400 }
        );
      }

      const updated = await saveAnalyzedVideo(
        user.id,
        video as EnrichedVideo,
        analysisResult as AnalysisResult,
        supabase
      );
      return NextResponse.json({ success: true, videos: updated });

    } else if (action === 'save_context') {
      if (!videos || !analysisResult) {
        return NextResponse.json({ error: 'Missing videos or analysisResult' }, { status: 400 });
      }

      const updated = await saveContextAnalysis(
        user.id,
        analysisResult as ContextAnalysisResult,
        videos as EnrichedVideo[],
        supabase
      );
      return NextResponse.json({ success: true, videos: updated });

    } else if (action === 'delete') {
      if (!videoId) {
        return NextResponse.json(
          { error: 'Missing videoId' },
          { status: 400 }
        );
      }

      const updated = await deleteAnalyzedVideo(user.id, videoId, supabase);
      return NextResponse.json({ success: true, videos: updated });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "save" or "delete"' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('POST /api/analyzed-videos error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}
