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
import { Loader2, Sparkles, Target, Layout, Lightbulb, Zap, RefreshCw, MessageCircle, Layers, Rocket, TrendingUp, ThumbsUp, AlertTriangle, Search, Scissors, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalysisDialogProps {
  analysis: any;
  isOpen: boolean;
  onClose: () => void;
  videoTitle?: string;
  isAnalyzing?: boolean;
  isAnalyzed?: boolean;
  onRefresh?: () => void;

  // 별표 기능 추가
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

  // 객체인 경우 문자열로 변환
  const formatContent = (content: any) => {
    if (typeof content === 'string') {
      return content;
    }
    if (typeof content === 'object' && content !== null) {
      return Object.entries(content)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n\n');
    }
    return String(content);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[600px] h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 pr-8">
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-red-500" />
                AI 전략 분석 리포트
              </DialogTitle>
              <DialogDescription className="line-clamp-1 mt-1.5">
                {videoTitle}
              </DialogDescription>

              {/* 채널 정보 및 별표 버튼 */}
              {channelTitle && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                  <span>{channelTitle}</span>
                  {onToggleSave && channelId && channelThumbnail && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSave({
                          channelId,
                          channelTitle,
                          thumbnail: channelThumbnail
                        });
                      }}
                      className={`p-1 rounded-full shrink-0 transition-colors ${
                        isSaved ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-400'
                      }`}
                      title={isSaved ? '채널 저장 취소' : '채널 저장'}
                    >
                      <Star className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pt-2 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              <p>Gemini 3.0 Flash가 영상을 분석 중입니다...</p>
            </div>
          ) : analysis ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8">
              {/* Context Analysis Sections */}
              {analysis.commonalities && (
                <section>
                  <div className="flex items-center gap-2 mb-3 text-purple-600 font-bold">
                    <Layers className="w-4 h-4" /> 공통된 성공 요인
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-100 dark:border-purple-900/50 text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {formatContent(analysis.commonalities)}
                  </div>
                </section>
              )}

              {analysis.strategies && (
                <section>
                  <div className="flex items-center gap-2 mb-3 text-indigo-600 font-bold">
                    <TrendingUp className="w-4 h-4" /> 트렌드 및 전략 분석
                  </div>
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50 text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {formatContent(analysis.strategies)}
                  </div>
                </section>
              )}

              {/* Single Video Analysis Sections */}
              {analysis.hook && (
                <section>
                  <div className="flex items-center gap-2 mb-3 text-red-600 font-bold">
                    <Zap className="w-4 h-4" /> 핵심 후킹 포인트
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-100 dark:border-red-900/50 text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {formatContent(analysis.hook)}
                  </div>
                </section>
              )}

              {/* Target */}
              {analysis.target && (
                <section>
                  <div className="flex items-center gap-2 mb-3 text-blue-600 font-bold">
                    <Target className="w-4 h-4" /> 타겟 오디언스
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50 text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {formatContent(analysis.target)}
                  </div>
                </section>
              )}

              {/* Community Needs */}
              {analysis.community_needs && (
                <section>
                  <div className="flex items-center gap-2 mb-3 text-pink-600 font-bold">
                    <MessageCircle className="w-4 h-4" /> 커뮤니티 니즈 & 반응
                  </div>
                  <div className="p-4 bg-pink-50 dark:bg-pink-950/30 rounded-lg border border-pink-100 dark:border-pink-900/50 text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {formatContent(analysis.community_needs)}
                  </div>
                </section>
              )}

              {/* Structure */}
              {analysis.structure && (
                <section>
                  <div className="flex items-center gap-2 mb-3 text-green-600 font-bold">
                    <Layout className="w-4 h-4" /> 콘텐츠 구성 전략
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-100 dark:border-green-900/50 text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {formatContent(analysis.structure)}
                  </div>
                </section>
              )}

              {/* Strengths - 강점 분석 */}
              {analysis.strengths && analysis.strengths.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3 text-emerald-600 font-bold">
                    <ThumbsUp className="w-4 h-4" /> 강점 분석
                  </div>
                  <div className="grid gap-3">
                    {analysis.strengths.map((strength: string, i: number) => (
                      <div key={i} className="flex gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-lg text-sm">
                        <Badge className="h-5 shrink-0 bg-emerald-500">+</Badge>
                        <span className="break-words">{strength}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Weaknesses - 약점 및 개선점 */}
              {analysis.weaknesses && analysis.weaknesses.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3 text-amber-600 font-bold">
                    <AlertTriangle className="w-4 h-4" /> 약점 및 개선점
                  </div>
                  <div className="grid gap-3">
                    {analysis.weaknesses.map((weakness: string, i: number) => (
                      <div key={i} className="flex gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-lg text-sm">
                        <Badge className="h-5 shrink-0 bg-amber-500">!</Badge>
                        <span className="break-words">{weakness}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Insights */}
              {analysis.insights && analysis.insights.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3 text-orange-600 font-bold">
                    <Lightbulb className="w-4 h-4" /> {analysis.commonalities ? "핵심 인사이트" : "벤치마킹 인사이트"}
                  </div>
                  <div className="grid gap-3">
                    {analysis.insights.map((insight: string, i: number) => (
                      <div key={i} className="flex gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm">
                        <Badge variant="secondary" className="h-5 shrink-0">{i + 1}</Badge>
                        <span className="break-words">{insight}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Search Keywords - 유사 소스 검색 키워드 */}
              {analysis.search_keywords && analysis.search_keywords.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3 text-violet-600 font-bold">
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

              {/* Editing Tips - 편집 방식 추천 */}
              {analysis.editing_tips && analysis.editing_tips.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3 text-cyan-600 font-bold">
                    <Scissors className="w-4 h-4" /> 편집 방식 추천
                  </div>
                  <div className="grid gap-3">
                    {analysis.editing_tips.map((tip: string, i: number) => (
                      <div key={i} className="flex gap-3 p-3 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/50 rounded-lg text-sm">
                        <Badge className="h-5 shrink-0 bg-cyan-500">{i + 1}</Badge>
                        <span className="break-words">{tip}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Action Plan (Context Analysis) */}
              {analysis.action_plan && (
                <section>
                  <div className="flex items-center gap-2 mb-3 text-teal-600 font-bold">
                    <Rocket className="w-4 h-4" /> 내 채널 적용 액션 플랜
                  </div>
                  <div className="p-4 bg-teal-50 dark:bg-teal-950/30 rounded-lg border border-teal-100 dark:border-teal-900/50 text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {formatContent(analysis.action_plan)}
                  </div>
                </section>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter className="p-6 pt-4 border-t bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
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
            <Button onClick={onClose}>
              닫기
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
