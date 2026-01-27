import { NextRequest, NextResponse } from 'next/server';
import { getTopComments } from '@/lib/youtube';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
  }

  try {
    const comments = await getTopComments(videoId);
    return NextResponse.json({ comments });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}
