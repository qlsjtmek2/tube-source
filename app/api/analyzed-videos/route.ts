import { NextRequest, NextResponse } from 'next/server';
import {
  getAnalyzedVideos,
  getAnalysis,
  saveAnalyzedVideo,
  deleteAnalyzedVideo
} from '@/lib/storage';
import { EnrichedVideo } from '@/lib/youtube';
import { AnalysisResult } from '@/lib/ai';

// GET: 분석된 영상 조회
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');

    if (videoId) {
      // 특정 영상의 분석 결과 조회
      const analysis = await getAnalysis(videoId);
      return NextResponse.json({ analysis });
    } else {
      // 모든 분석된 영상 목록 조회
      const videos = await getAnalyzedVideos();
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
    const body = await req.json();
    const { action, videoId, video, analysisResult } = body;

    if (action === 'save') {
      // 분석 결과 저장 또는 업데이트
      if (!video || !analysisResult) {
        return NextResponse.json(
          { error: 'Missing video or analysisResult' },
          { status: 400 }
        );
      }

      const updated = await saveAnalyzedVideo(
        video as EnrichedVideo,
        analysisResult as AnalysisResult
      );
      return NextResponse.json({ success: true, videos: updated });

    } else if (action === 'delete') {
      // 분석 결과 삭제
      if (!videoId) {
        return NextResponse.json(
          { error: 'Missing videoId' },
          { status: 400 }
        );
      }

      const updated = await deleteAnalyzedVideo(videoId);
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
