"use client";

import { VideoCard } from "@/components/video-card";
import { ReportCard } from "@/components/report-card";
import { EnrichedVideo } from "@/lib/youtube";

interface VideoListProps {
  videos: EnrichedVideo[];
  loading?: boolean;
  savedChannelIds?: string[];
  onToggleSave?: (channel: { channelId: string; channelTitle: string; thumbnail: string }) => void;
  onDownload?: (video: { id: string; title: string }) => void;
  onAnalyze?: (video: EnrichedVideo) => void;
  onViewSubtitle?: (video: EnrichedVideo) => void;
  onViewComments?: (video: EnrichedVideo) => void;
  onDeleteAnalysis?: (videoId: string) => void;
  onRemove?: (videoId: string) => void;
  selectionMode?: boolean;
  selectedVideoIds?: Set<string>;
  onSelectVideo?: (videoId: string) => void;
  onChannelClick?: (channelId: string) => void;
}

export function VideoList({
  videos,
  loading,
  savedChannelIds = [],
  onToggleSave,
  onDownload,
  onAnalyze,
  onViewSubtitle,
  onViewComments,
  onDeleteAnalysis,
  onRemove,
  selectionMode = false,
  selectedVideoIds = new Set(),
  onSelectVideo,
  onChannelClick
}: VideoListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="aspect-[3/4] bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        검색 결과가 없습니다. 필터를 조정해보세요.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20 w-full auto-rows-fr">
      {videos.map((video) => {
        const isReport = video.id.startsWith('report-');
        
        return (
          <div key={video.id} className="flex h-full">
            {isReport ? (
              <ReportCard 
                video={video}
                onAnalyze={onAnalyze}
                onDelete={onDeleteAnalysis}
              />
            ) : (
              <VideoCard
                video={video}
                isSaved={savedChannelIds.includes(video.channelId)}
                onToggleSave={onToggleSave}
                onDownload={onDownload}
                onAnalyze={onAnalyze}
                onViewSubtitle={onViewSubtitle}
                onViewComments={onViewComments}
                onDeleteAnalysis={onDeleteAnalysis}
                onRemove={onRemove}
                selectionMode={selectionMode}
                isSelected={selectedVideoIds.has(video.id)}
                onSelect={() => onSelectVideo?.(video.id)}
                onChannelClick={onChannelClick}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}