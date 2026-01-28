import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EnrichedVideo } from "@/lib/youtube";
import { Calendar, Eye, MessageCircle, Star, ThumbsUp, User, Users, CheckCircle2, Circle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoCardProps {
  video: EnrichedVideo;
  isSaved?: boolean;
  onToggleSave?: (channel: { channelId: string; channelTitle: string; thumbnail: string }) => void;
  onDownload?: (video: { id: string; title: string }) => void;
  onAnalyze?: (video: EnrichedVideo) => void;
  onViewSubtitle?: (video: EnrichedVideo) => void;
  onViewComments?: (video: EnrichedVideo) => void;
  onDeleteAnalysis?: (videoId: string) => void;
  onRemove?: (videoId: string) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onChannelClick?: (channelId: string) => void;
}

export function VideoCard({ 
  video, 
  isSaved, 
  onToggleSave, 
  onDownload, 
  onAnalyze, 
  onViewSubtitle, 
  onViewComments, 
  onDeleteAnalysis,
  onRemove,
  selectionMode = false,
  isSelected = false,
  onSelect,
  onChannelClick
}: VideoCardProps) {
  // Format numbers
  const formatNumber = (num: number) => {
    if (num >= 100000000) {
      return (num / 100000000).toFixed(1).replace(/\.0$/, '') + '억';
    }
    if (num >= 10000) {
      return (num / 10000).toFixed(1).replace(/\.0$/, '') + '만';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + '천';
    }
    return num.toLocaleString();
  };
  
  // Format Date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };
  
  // Parse Duration (ISO 8601 PT15M33S -> 15:33)
  const formatDuration = (isoDuration: string) => {
    const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return isoDuration;
    
    const h = (match[1] || '').replace('H', '');
    const m = (match[2] || '').replace('M', '');
    const s = (match[3] || '').replace('S', '');
    
    if (h) return `${h}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`;
    return `${m || '0'}:${s.padStart(2, '0')}`;
  };

  return (
    <Card 
      className={cn(
        "overflow-hidden hover:shadow-lg transition-all group flex flex-col h-full w-full max-w-sm mx-auto border-border bg-card",
        selectionMode && "cursor-pointer",
        isSelected && "ring-2 ring-danger border-danger bg-danger/5"
      )}
      onClick={() => selectionMode && onSelect?.()}
    >
      {/* Selection Overlay */}
      {selectionMode && (
        <div className="absolute top-2 right-2 z-20">
          {isSelected ? (
            <CheckCircle2 className="w-6 h-6 text-danger bg-background rounded-full fill-background" />
          ) : (
            <Circle className="w-6 h-6 text-white drop-shadow-md" />
          )}
        </div>
      )}

      {/* Remove Button (Search Result Mode) */}
      {!selectionMode && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(video.id);
          }}
          className="absolute top-2 right-2 z-20 p-1.5 bg-black/60 hover:bg-danger text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
          title="목록에서 제거"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}

      {/* Thumbnail Link */}
      <div className="relative aspect-video bg-muted overflow-hidden shrink-0">
        <a 
          href={selectionMode ? undefined : `https://www.youtube.com/watch?v=${video.id}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className={cn("block w-full h-full", !selectionMode && "cursor-pointer")}
          onClick={(e) => selectionMode && e.preventDefault()}
        >
          <img 
            src={video.thumbnail} 
            alt={video.title} 
            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
            loading="lazy"
          />
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono z-10">
            {formatDuration(video.duration)}
          </div>
          {video.creativeCommons && (
             <div className="absolute top-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-bold z-10">CC</div>
          )}
        </a>
      </div>

      <CardContent className="p-4 flex flex-col flex-1 gap-3">
        {/* Title & Channel */}
        <div className="space-y-1">
          <a 
            href={selectionMode ? undefined : `https://www.youtube.com/watch?v=${video.id}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block group/title"
            onClick={(e) => selectionMode && e.preventDefault()}
          >
            <h3 className="font-bold text-sm leading-snug line-clamp-2 h-10 group-hover/title:text-danger transition-colors text-foreground">
              {video.title}
            </h3>
          </a>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1 min-w-0">
              <span 
                className="flex items-center gap-1 hover:text-foreground cursor-pointer truncate hover:underline underline-offset-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onChannelClick?.(video.channelId);
                }}
              >
                <User className="w-3 h-3" /> {video.channelTitle}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave?.({
                    channelId: video.channelId,
                    channelTitle: video.channelTitle,
                    thumbnail: video.channelThumbnail
                  });
                }}
                className={cn(
                  "p-1 rounded-full shrink-0 transition-colors",
                  isSaved ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-400"
                )}
              >
                <Star className={cn("w-3 h-3", isSaved && "fill-current")} />
              </button>
            </div>
            <span className="flex items-center gap-1 shrink-0">
              <Calendar className="w-3 h-3" /> {formatDate(video.publishedAt)}
            </span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3 bg-muted/50 p-2 rounded-md">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">조회수</span>
            <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
              <Eye className="w-3 h-3" /> {formatNumber(video.viewCount)}
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">구독자</span>
            <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
              <Users className="w-3 h-3" /> {formatNumber(video.subscriberCount)}
            </div>
          </div>
        </div>

        {/* Performance Badges */}
        <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="outline" className={cn("text-[10px] h-5", video.performanceRatio > 100 ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900" : "text-muted-foreground")}>
               성과도: {video.performanceRatio}%
            </Badge>
            <Badge variant="outline" className={cn("text-[10px] h-5", video.engagementRate > 5 ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900" : "text-muted-foreground")}>
               참여율: {video.engagementRate}%
            </Badge>
        </div>
        
        {/* Detailed Stats (Small) */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
             <div className="flex gap-3">
                <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {formatNumber(video.likeCount)}</span>
                <button 
                  onClick={(e) => {
                    if (selectionMode) return;
                    e.stopPropagation();
                    onViewComments?.(video);
                  }}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 border border-border group/comment transition-all",
                    !selectionMode && "hover:bg-info/10 hover:text-info hover:border-info/20 cursor-pointer"
                  )}
                  title={selectionMode ? undefined : "베스트 댓글 보기"}
                  disabled={selectionMode}
                >
                  <MessageCircle className="w-3 h-3 group-hover/comment:scale-110 transition-transform" /> 
                  <span className="font-medium">{formatNumber(video.commentCount)}</span>
                </button>
             </div>
             {onDeleteAnalysis ? (
               <button
                 onClick={(e) => {
                    e.stopPropagation();
                    onDeleteAnalysis(video.id);
                 }}
                 className="text-muted-foreground hover:text-danger transition-colors"
                 title="분석 결과 삭제"
                 disabled={selectionMode}
               >
                 삭제
               </button>
             ) : (
               <span className="text-[10px]">총 영상 수: {formatNumber(video.channelVideoCount)}</span>
             )}
        </div>
        
        {/* Action Buttons */}
        {!selectionMode && (
          <div className="mt-auto pt-3 grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[11px] px-1"
                onClick={(e) => { e.stopPropagation(); onAnalyze?.(video); }}
              >
                AI 분석
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-[11px] px-1"
                onClick={(e) => { e.stopPropagation(); onDownload?.({ id: video.id, title: video.title }); }}
              >
                다운로드
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[11px] px-1"
                onClick={(e) => { e.stopPropagation(); onViewSubtitle?.(video); }}
                disabled={!video.subtitleText}
                title={!video.subtitleText ? "자막 없음" : "자막 보기"}
              >
                자막 보기
              </Button>
          </div>
        )}

      </CardContent>
    </Card>
  );
}