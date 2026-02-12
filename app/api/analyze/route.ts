import { NextRequest, NextResponse } from 'next/server';
import { analyzeVideoStrategy } from '@/lib/ai';
import { getTopComments } from '@/lib/youtube';
import { createClient } from '@/lib/supabase-server';
import { checkAndIncrementQuota } from '@/lib/quota';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Quota 체크 및 증가
    const quota = await checkAndIncrementQuota(user.id, supabase);
    if (!quota.allowed) {
      return NextResponse.json({ error: quota.reason }, { status: 403 });
    }

    const videoData = await req.json();
    
    if (!videoData) {
      return NextResponse.json({ error: 'Video data is required' }, { status: 400 });
    }

    // 2. 분석 전에 베스트 댓글 가져오기 (문맥 제공용)
    let comments: any[] = [];
    try {
        comments = await getTopComments(videoData.id, 20); // Top 20 comments
    } catch (e) {
        console.warn('Failed to fetch comments for analysis context:', e);
    }

    // 3. AI 분석 수행
    const analysis = await analyzeVideoStrategy(videoData, comments);
    
    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
