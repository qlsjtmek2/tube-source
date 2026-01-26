"use client";

import { VideoCard } from "@/components/video-card";
import { EnrichedVideo } from "@/lib/youtube";

interface VideoListProps {
  videos: EnrichedVideo[];
  loading?: boolean;
  savedChannelIds?: string[];
  onToggleSave?: (channel: { channelId: string; channelTitle: string; thumbnail: string }) => void;
  onDownload?: (video: { id: string; title: string }) => void;
  onAnalyze?: (video: EnrichedVideo) => void;
}

export function VideoList({ videos, loading, savedChannelIds = [], onToggleSave, onDownload, onAnalyze }: VideoListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-[340px] bg-slate-200 dark:bg-slate-800 rounded-lg" />
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500">
        검색 결과가 없습니다. 필터를 조정해보세요.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20 w-full auto-rows-fr">
      {videos.map((video) => (
        <div key={video.id} className="flex h-full">
          <VideoCard 
            video={video} 
            isSaved={savedChannelIds.includes(video.channelId)}
            onToggleSave={onToggleSave}
            onDownload={onDownload}
            onAnalyze={onAnalyze}
          />
        </div>
      ))}
    </div>
  );
}
