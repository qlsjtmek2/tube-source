import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EnrichedVideo } from "@/lib/youtube";
import { Calendar, Eye, Layers, Lightbulb, MessageCircle, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportCardProps {
  video: EnrichedVideo;
  onAnalyze?: (video: EnrichedVideo) => void;
  onDelete?: (videoId: string) => void;
}

export function ReportCard({ 
  video, 
  onAnalyze, 
  onDelete
}: ReportCardProps) {
  // Format numbers
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);
  };
  
  // Format Date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all group flex flex-col h-full w-full max-w-sm mx-auto border-purple-200 dark:border-purple-900 bg-white dark:bg-slate-950 relative">
      {/* Thumbnail Placeholder Area */}
      <div 
        className="aspect-video bg-gradient-to-br from-purple-50 to-slate-100 dark:from-purple-900/20 dark:to-slate-900 relative overflow-hidden shrink-0 cursor-pointer flex items-center justify-center group-hover:from-purple-100 dark:group-hover:from-purple-900/30 transition-colors"
        onClick={() => onAnalyze?.(video)}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300 ring-1 ring-purple-100 dark:ring-purple-900">
            <Layers className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 pointer-events-none">
            AI 맥락 리포트
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 flex flex-col flex-1 gap-3">
        {/* Title & Date */}
        <div className="space-y-1">
          <h3 
            className="font-bold text-sm leading-snug line-clamp-2 h-10 group-hover:text-purple-600 transition-colors cursor-pointer"
            onClick={() => onAnalyze?.(video)}
          >
            {video.title}
          </h3>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
             <span className="flex items-center gap-1">
               <Calendar className="w-3 h-3" /> {formatDate(video.publishedAt)}
             </span>
          </div>
        </div>

        {/* Aggregate Metrics */}
        <div className="grid grid-cols-2 gap-2 mb-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-md">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-bold">총 조회수</span>
            <div className="flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <Eye className="w-3 h-3 text-slate-400" /> {formatNumber(video.viewCount)}
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-bold">총 좋아요</span>
            <div className="flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <ThumbsUp className="w-3 h-3 text-slate-400" /> {formatNumber(video.likeCount)}
            </div>
          </div>
        </div>

        {/* Report Highlights Badges */}
        <div className="flex flex-wrap gap-1.5 mb-2">
           <Badge variant="outline" className="text-[10px] h-5 border-slate-200 text-slate-500 font-normal">
              <Lightbulb className="w-3 h-3 mr-1" /> 인사이트
           </Badge>
           <Badge variant="outline" className="text-[10px] h-5 border-slate-200 text-slate-500 font-normal">
              <MessageCircle className="w-3 h-3 mr-1" /> 전략
           </Badge>
        </div>
        
        {/* Stats Row with Delete Button (Matches VideoCard) */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 mt-auto">
             <div className="flex gap-3">
                {/* Spacer or additional info could go here */}
             </div>
             {onDelete && (
               <button
                 onClick={(e) => {
                    e.stopPropagation();
                    onDelete(video.id);
                 }}
                 className="text-red-400 hover:text-red-600 transition-colors"
                 title="리포트 삭제"
               >
                 삭제
               </button>
             )}
        </div>
        
        {/* Action Buttons (Matches VideoCard) */}
        <div className="pt-3">
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-[11px] px-1 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 dark:hover:bg-purple-900/30 dark:hover:border-purple-800 transition-all"
              onClick={(e) => { e.stopPropagation(); onAnalyze?.(video); }}
            >
              <Layers className="w-3 h-3 mr-1.5" />
              리포트 보기
            </Button>
        </div>

      </CardContent>
    </Card>
  );
}
