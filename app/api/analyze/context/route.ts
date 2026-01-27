import { NextRequest, NextResponse } from 'next/server';
import { analyzeContextStrategy } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { videos, prompt } = await req.json();
    
    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json({ error: 'Video list is required' }, { status: 400 });
    }

    const analysis = await analyzeContextStrategy(videos, prompt);
    
    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error('AI Context Analysis Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
