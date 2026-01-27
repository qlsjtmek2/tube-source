import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EnrichedVideo } from "@/lib/youtube";
import { Calendar, Eye, Layers, Lightbulb, MessageCircle, ThumbsUp, Trash2 } from "lucide-react";
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
    <Card className="overflow-hidden hover:shadow-lg transition-all group flex flex-col h-full w-full max-w-sm mx-auto border-purple-200 dark:border-purple-900 bg-purple-50/10 relative">
      {/* Thumbnail Area with Overlay */}
      <div 
        className="aspect-video bg-slate-100 dark:bg-slate-800 relative overflow-hidden shrink-0 cursor-pointer"
        onClick={() => onAnalyze?.(video)}
      >
        <img 
          src={video.thumbnail} 
          alt={video.title} 
          className="w-full h-full object-cover blur-[2px] opacity-80 transition-transform group-hover:scale-105 duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-purple-900/20 backdrop-blur-[1px]">
          <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-full shadow-lg mb-2 group-hover:scale-110 transition-transform duration-300">
            <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200">
            AI Context Report
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

        {/* Aggregate Metrics (Visual Only) */}
        <div className="grid grid-cols-2 gap-2 mb-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-md">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Total Views</span>
            <div className="flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <Eye className="w-3 h-3 text-slate-400" /> {formatNumber(video.viewCount)}
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Total Likes</span>
            <div className="flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <ThumbsUp className="w-3 h-3 text-slate-400" /> {formatNumber(video.likeCount)}
            </div>
          </div>
        </div>

        {/* Report Highlights (Static Badges) */}
        <div className="flex flex-wrap gap-1.5 mb-2">
           <Badge variant="outline" className="text-[10px] h-5 border-slate-200 text-slate-500 font-normal">
              <Lightbulb className="w-3 h-3 mr-1" /> Insights
           </Badge>
           <Badge variant="outline" className="text-[10px] h-5 border-slate-200 text-slate-500 font-normal">
              <MessageCircle className="w-3 h-3 mr-1" /> Strategy
           </Badge>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-auto pt-3 flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-8 text-[11px] bg-purple-600 hover:bg-purple-700 text-white"
              onClick={(e) => { e.stopPropagation(); onAnalyze?.(video); }}
            >
              <Layers className="w-3 h-3 mr-1.5" />
              리포트 보기
            </Button>
            {onDelete && (
                <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-slate-200 dark:border-slate-800"
                    onClick={(e) => { e.stopPropagation(); onDelete(video.id); }}
                    title="리포트 삭제"
                >
                    <Trash2 className="w-3 h-3" />
                </Button>
            )}
        </div>

      </CardContent>
    </Card>
  );
}
