import { NextRequest, NextResponse } from 'next/server';
import { searchVideos, VideoSearchFilters } from '@/lib/youtube';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const filters: VideoSearchFilters = body.filters;
    
    // Validate Query
    if (!filters?.q) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const videos = await searchVideos(filters);
    
    return NextResponse.json({ videos });
  } catch (error: any) {
    console.error('Search API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}