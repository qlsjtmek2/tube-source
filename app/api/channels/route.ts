import { NextRequest, NextResponse } from 'next/server';
import { getSavedChannels, saveChannel, removeChannel, SavedChannel } from '@/lib/storage';

export async function GET() {
  try {
    const channels = await getSavedChannels();
    return NextResponse.json({ channels });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, channel } = body;

    if (action === 'save') {
      const updated = await saveChannel(channel);
      return NextResponse.json({ channels: updated });
    }

    if (action === 'remove') {
      const updated = await removeChannel(channel.channelId);
      return NextResponse.json({ channels: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
