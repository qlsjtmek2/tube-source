import { NextRequest, NextResponse } from 'next/server';
import { getChannelDetails } from '@/lib/youtube';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    const details = await getChannelDetails(channelId);
    return NextResponse.json({ details });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch channel details' }, { status: 500 });
  }
}
