import { NextRequest } from 'next/server';
import { downloadVideo } from '@/lib/downloader';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('videoId');
  const url = searchParams.get('url');
  const format = searchParams.get('format') as 'mp4' | 'mp3';

  if ((!videoId && !url) || !format) {
    return new Response('Missing parameters', { status: 400 });
  }

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}

`));
      };

      try {
        send({ status: 'starting', message: '다운로드 준비 중...' });
        
        await downloadVideo({ videoId: videoId || undefined, url: url || undefined, format }, (event) => {
          if (event.type === 'progress') {
            send({ status: 'progress', progress: event.value, message: `다운로드 중: ${event.value}` });
          } else if (event.type === 'title') {
            send({ status: 'title', title: event.value });
          } else if (event.type === 'destination') {
            send({ status: 'destination', path: event.value });
          }
        });

        send({ status: 'completed', message: '다운로드 완료!' });
        controller.close();
      } catch (error: any) {
        send({ status: 'error', message: error.message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
