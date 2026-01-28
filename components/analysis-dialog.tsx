"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Target, Layout, Lightbulb, Zap, RefreshCw, MessageCircle, Layers, Rocket, TrendingUp, ThumbsUp, AlertTriangle, Search, Scissors, Star, Clock, FileText, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalysisDialogProps {
  analysis: any;
  isOpen: boolean;
  onClose: () => void;
  videoTitle?: string;
  isAnalyzing?: boolean;
  isAnalyzed?: boolean;
  onRefresh?: () => void;
  isSaved?: boolean;
  onToggleSave?: (channel: {
    channelId: string;
    channelTitle: string;
    thumbnail: string;
  }) => void;
  channelId?: string;
  channelTitle?: string;
  channelThumbnail?: string;
  duration?: string;
  transcript?: string;
}

// Reusable Section Component
function AnalysisSection({
  icon: Icon,
  title,
  content,
  colorClass,
  bgColorClass,
  borderColorClass
}: {
  icon: LucideIcon;
  title: string;
  content: string;
  colorClass: string;
  bgColorClass: string;
  borderColorClass: string;
}) {
  if (!content) return null;

  return (
    <section>
      <div className={cn("flex items-center gap-2 mb-3 font-bold", colorClass)}>
        <Icon className="w-4 h-4" /> {title}
      </div>
      <div className={cn("p-4 rounded-lg border text-sm leading-relaxed whitespace-pre-wrap break-words", bgColorClass, borderColorClass)}>
        {typeof content === 'object' 
          ? Object.entries(content).map(([k, v]) => `${k}: ${v}`).join('\n\n') 
          : String(content)}
      </div>
    </section>
  );
}

// Reusable List Section Component
function AnalysisListSection({
  icon: Icon,
  title,
  items,
  colorClass,
  badgeColorClass,
  badgeVariant = "default",
  badgePrefix
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
  colorClass: string;
  badgeColorClass?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  badgePrefix?: string;
}) {
  if (!items || items.length === 0) return null;

  return (
    <section>
      <div className={cn("flex items-center gap-2 mb-3 font-bold", colorClass)}>
        <Icon className="w-4 h-4" /> {title}
      </div>
      <div className="grid gap-3">
        {items.map((item, i) => (
          <div key={i} className={cn("flex gap-3 p-3 rounded-lg text-sm border bg-card dark:bg-card/50")}>
            <Badge variant={badgeVariant} className={cn("h-5 shrink-0", badgeColorClass)}>
              {badgePrefix || i + 1}
            </Badge>
            <span className="break-words">{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AnalysisDialog({
  analysis,
  isOpen,
  onClose,
  videoTitle,
  isAnalyzing = false,
  isAnalyzed = false,
  onRefresh,
  isSaved = false,
  onToggleSave,
  channelId,
  channelTitle,
  channelThumbnail,
  duration,
  transcript
}: AnalysisDialogProps) {
  const loading = isAnalyzing;
  
  // Format duration function
  const formatDuration = (isoDuration: string) => {
    if (!isoDuration) return '';
    return isoDuration
      .replace('PT', '')
      .replace('H', '시간 ')
      .replace('M', '분 ')
      .replace('S', '초')
      .trim();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[600px] h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 pr-8">
              <DialogTitle className="flex items-center gap-2 text-primary">
                <Sparkles className="w-5 h-5 text-red-500" />
                AI 전략 분석 리포트
              </DialogTitle>
              <DialogDescription className="line-clamp-1 mt-1.5 text-muted-foreground">
                {videoTitle}
              </DialogDescription>
              
              {duration && (
                <div className="mt-2">
                   <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 font-normal text-muted-foreground border-slate-300 dark:border-slate-700">
                     <Clock className="w-3 h-3" /> {formatDuration(duration)}
                   </Badge>
                </div>
              )}

              {channelTitle && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                  <span>{channelTitle}</span>
                  {onToggleSave && channelId && channelThumbnail && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSave({ channelId, channelTitle, thumbnail: channelThumbnail });
                      }}
                      className={cn(
                        "p-1 rounded-full shrink-0 transition-colors",
                        isSaved ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-400"
                      )}
                      title={isSaved ? '채널 저장 취소' : '채널 저장'}
                    >
                      <Star className={cn("w-3.5 h-3.5", isSaved && "fill-current")} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pt-2 min-h-0 bg-background">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p>Gemini 3.0 Flash가 영상을 분석 중입니다...</p>
            </div>
          ) : analysis ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8">
              <AnalysisSection
                icon={Layers}
                title="공통된 성공 요인"
                content={analysis.commonalities}
                colorClass="text-purple-600 dark:text-purple-400"
                bgColorClass="bg-purple-50 dark:bg-purple-950/20"
                borderColorClass="border-purple-100 dark:border-purple-900/50"
              />
              <AnalysisSection
                icon={TrendingUp}
                title="트렌드 및 전략 분석"
                content={analysis.strategies}
                colorClass="text-indigo-600 dark:text-indigo-400"
                bgColorClass="bg-indigo-50 dark:bg-indigo-950/20"
                borderColorClass="border-indigo-100 dark:border-indigo-900/50"
              />
              <AnalysisSection
                icon={Zap}
                title="핵심 후킹 포인트"
                content={analysis.hook}
                colorClass="text-red-600 dark:text-red-400"
                bgColorClass="bg-red-50 dark:bg-red-950/20"
                borderColorClass="border-red-100 dark:border-red-900/50"
              />
              <AnalysisSection
                icon={Target}
                title="타겟 오디언스"
                content={analysis.target}
                colorClass="text-blue-600 dark:text-blue-400"
                bgColorClass="bg-blue-50 dark:bg-blue-950/20"
                borderColorClass="border-blue-100 dark:border-blue-900/50"
              />
              <AnalysisSection
                icon={MessageCircle}
                title="커뮤니티 니즈 & 반응"
                content={analysis.community_needs}
                colorClass="text-pink-600 dark:text-pink-400"
                bgColorClass="bg-pink-50 dark:bg-pink-950/20"
                borderColorClass="border-pink-100 dark:border-pink-900/50"
              />
              <AnalysisSection
                icon={Layout}
                title="콘텐츠 구성 전략"
                content={analysis.structure}
                colorClass="text-green-600 dark:text-green-400"
                bgColorClass="bg-green-50 dark:bg-green-950/20"
                borderColorClass="border-green-100 dark:border-green-900/50"
              />

              <AnalysisListSection
                icon={ThumbsUp}
                title="강점 분석"
                items={analysis.strengths}
                colorClass="text-emerald-600 dark:text-emerald-400"
                badgeColorClass="bg-emerald-500 text-white"
                badgePrefix="+"
              />
              <AnalysisListSection
                icon={AlertTriangle}
                title="약점 및 개선점"
                items={analysis.weaknesses}
                colorClass="text-amber-600 dark:text-amber-400"
                badgeColorClass="bg-amber-500 text-white"
                badgePrefix="!"
              />
              <AnalysisListSection
                icon={Lightbulb}
                title={analysis.commonalities ? "핵심 인사이트" : "벤치마킹 인사이트"}
                items={analysis.insights}
                colorClass="text-orange-600 dark:text-orange-400"
                badgeVariant="secondary"
              />

              {/* Keywords - Custom Render due to horizontal layout */}
              {analysis.search_keywords && analysis.search_keywords.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3 text-violet-600 dark:text-violet-400 font-bold">
                    <Search className="w-4 h-4" /> 유사 소스 검색 키워드
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.search_keywords.map((keyword: string, i: number) => (
                      <Badge key={i} variant="outline" className="px-3 py-1.5 text-sm bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              <AnalysisListSection
                icon={Scissors}
                title="편집 방식 추천"
                items={analysis.editing_tips}
                colorClass="text-cyan-600 dark:text-cyan-400"
                badgeColorClass="bg-cyan-500 text-white"
              />

              <AnalysisSection
                icon={Rocket}
                title="내 채널 적용 액션 플랜"
                content={analysis.action_plan}
                colorClass="text-teal-600 dark:text-teal-400"
                bgColorClass="bg-teal-50 dark:bg-teal-950/20"
                borderColorClass="border-teal-100 dark:border-teal-900/50"
              />

              {/* Transcript Section */}
              {transcript && (
                <section className="pt-4 border-t border-dashed border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-3 text-slate-600 dark:text-slate-400 font-bold">
                    <FileText className="w-4 h-4" /> 영상 자막
                  </div>
                  <div className="p-4 rounded-lg border text-sm leading-relaxed whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 max-h-60 overflow-y-auto custom-scrollbar">
                    {transcript}
                  </div>
                </section>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter className="p-6 pt-4 border-t bg-muted/50 shrink-0">
          <div className="flex items-center justify-between w-full gap-4">
            {isAnalyzed && onRefresh ? (
              <Button
                variant="outline"
                onClick={onRefresh}
                disabled={isAnalyzing}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isAnalyzing && "animate-spin")} />
                다시 분석하기
              </Button>
            ) : (
               <div /> /* Spacer */
            )}
            <Button onClick={onClose}>닫기</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}