import { NextRequest, NextResponse } from 'next/server';
import { analyzeVideoStrategy } from '@/lib/ai';
import { getTopComments } from '@/lib/youtube';

export async function POST(req: NextRequest) {
  try {
    const videoData = await req.json();
    
    if (!videoData) {
      return NextResponse.json({ error: 'Video data is required' }, { status: 400 });
    }

    // 분석 전에 베스트 댓글 가져오기 (문맥 제공용)
    let comments: any[] = [];
    try {
        comments = await getTopComments(videoData.id, 20); // Top 20 comments
    } catch (e) {
        console.warn('Failed to fetch comments for analysis context:', e);
    }

    const analysis = await analyzeVideoStrategy(videoData, comments);
    
    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
