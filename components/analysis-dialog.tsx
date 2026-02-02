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
import { Loader2, Sparkles, Target, Layout, Lightbulb, Zap, RefreshCw, MessageCircle, Layers, Rocket, TrendingUp, ThumbsUp, AlertTriangle, Search, Scissors, Star, type LucideIcon } from "lucide-react";
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
}

// Reusable Section Component
function AnalysisSection({
  icon: Icon,
  title,
  content
}: {
  icon: LucideIcon;
  title: string;
  content: string;
}) {
  if (!content) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3 font-semibold text-foreground">
        <Icon className="w-4 h-4 text-muted-foreground" /> {title}
      </div>
      <div className="p-4 rounded-lg border border-border bg-muted/50 text-sm leading-relaxed whitespace-pre-wrap break-words">
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
  badgeVariant = "secondary",
  badgePrefix
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
  badgeVariant?: "default" | "secondary" | "destructive" | "outline" | "danger" | "info";
  badgePrefix?: string;
}) {
  if (!items || items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3 font-semibold text-foreground">
        <Icon className="w-4 h-4 text-muted-foreground" /> {title}
      </div>
      <div className="grid gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg text-sm border border-border bg-muted/30">
            <Badge variant={badgeVariant} className="h-5 shrink-0">
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
  channelThumbnail
}: AnalysisDialogProps) {
  const loading = isAnalyzing;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex flex-col p-0 overflow-hidden" style={{ width: '95vw', maxWidth: '900px', height: '85vh' }}>
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
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8">
              <AnalysisSection
                icon={Layers}
                title="공통된 성공 요인"
                content={analysis.commonalities}
              />
              <AnalysisSection
                icon={TrendingUp}
                title="트렌드 및 전략 분석"
                content={analysis.strategies}
              />
              <AnalysisSection
                icon={Zap}
                title="핵심 후킹 포인트"
                content={analysis.hook}
              />
              <AnalysisSection
                icon={Target}
                title="타겟 오디언스"
                content={analysis.target}
              />
              <AnalysisSection
                icon={MessageCircle}
                title="커뮤니티 니즈 & 반응"
                content={analysis.community_needs}
              />
              <AnalysisSection
                icon={Layout}
                title="콘텐츠 구성 전략"
                content={analysis.structure}
              />

              <AnalysisListSection
                icon={ThumbsUp}
                title="강점 분석"
                items={analysis.strengths}
                badgeVariant="info"
                badgePrefix="+"
              />
              <AnalysisListSection
                icon={AlertTriangle}
                title="약점 및 개선점"
                items={analysis.weaknesses}
                badgeVariant="danger"
                badgePrefix="!"
              />
              <AnalysisListSection
                icon={Lightbulb}
                title={analysis.commonalities ? "핵심 인사이트" : "벤치마킹 인사이트"}
                items={analysis.insights}
              />

              {/* Keywords */}
              {analysis.search_keywords && analysis.search_keywords.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3 font-semibold text-foreground">
                    <Search className="w-4 h-4 text-muted-foreground" /> 유사 소스 검색 키워드
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.search_keywords.map((keyword: string, i: number) => (
                      <Badge key={i} variant="outline" className="px-3 py-1.5 text-sm">
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
              />

              <AnalysisSection
                icon={Rocket}
                title="내 채널 적용 액션 플랜"
                content={analysis.action_plan}
              />
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