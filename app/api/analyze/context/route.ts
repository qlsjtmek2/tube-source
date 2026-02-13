import { NextRequest, NextResponse } from 'next/server';
import { analyzeContextStrategy } from '@/lib/ai';
import { createClient } from '@/lib/supabase-server';
import { getQuotaConfig } from '@/lib/quota';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 유저 등급 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const tier = profile?.subscription_tier || 'FREE';
    const config = getQuotaConfig(tier);

    // PRO 전용 기능 체크
    if (!config.canUseContextAnalysis) {
      return NextResponse.json({ 
        error: '맥락 분석은 PRO 등급 전용 기능입니다. 등급을 업그레이드 하세요!' 
      }, { status: 403 });
    }

    const { videos } = await req.json();
    
    if (!videos || !Array.isArray(videos)) {
      return NextResponse.json({ error: 'Videos array is required' }, { status: 400 });
    }

    const analysis = await analyzeContextStrategy(videos);
    
    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error('AI Context Analysis Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
