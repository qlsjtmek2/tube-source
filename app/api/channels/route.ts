import { NextRequest, NextResponse } from 'next/server';
import { getSavedChannels, saveChannel, removeChannel, SavedChannel } from '@/lib/storage';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const channels = await getSavedChannels(user.id, supabase);
    return NextResponse.json({ channels });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, channel } = body;

    if (action === 'save') {
      const updated = await saveChannel(user.id, channel as SavedChannel, supabase);
      return NextResponse.json({ channels: updated });
    }

    if (action === 'remove') {
      const updated = await removeChannel(user.id, channel.channelId, supabase);
      return NextResponse.json({ channels: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
