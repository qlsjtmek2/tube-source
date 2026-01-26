import { NextRequest, NextResponse } from 'next/server';
import { analyzeVideoStrategy } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const videoData = await req.json();
    
    if (!videoData) {
      return NextResponse.json({ error: 'Video data is required' }, { status: 400 });
    }

    const analysis = await analyzeVideoStrategy(videoData);
    
    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
