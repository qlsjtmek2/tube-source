"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Target, Layout, Lightbulb, Zap } from "lucide-react";

interface AnalysisDialogProps {
  analysis: any;
  isOpen: boolean;
  onClose: () => void;
  videoTitle?: string;
}

export function AnalysisDialog({ analysis, isOpen, onClose, videoTitle }: AnalysisDialogProps) {
  const loading = !analysis;

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
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI 전략 분석 리포트
          </DialogTitle>
          <DialogDescription className="line-clamp-1">
            {videoTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pt-2 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              <p>Gemini 3.0 Flash가 영상을 분석 중입니다...</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8">
              {/* Hook */}
              <section>
                <div className="flex items-center gap-2 mb-3 text-purple-600 font-bold">
                  <Zap className="w-4 h-4" /> 핵심 후킹 포인트
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-100 dark:border-purple-900/50 text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {formatContent(analysis.hook)}
                </div>
              </section>

              {/* Target */}
              <section>
                <div className="flex items-center gap-2 mb-3 text-blue-600 font-bold">
                  <Target className="w-4 h-4" /> 타겟 오디언스
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50 text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {formatContent(analysis.target)}
                </div>
              </section>

              {/* Structure */}
              <section>
                <div className="flex items-center gap-2 mb-3 text-green-600 font-bold">
                  <Layout className="w-4 h-4" /> 콘텐츠 구성 전략
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-100 dark:border-green-900/50 text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {formatContent(analysis.structure)}
                </div>
              </section>

              {/* Insights */}
              <section>
                <div className="flex items-center gap-2 mb-3 text-orange-600 font-bold">
                  <Lightbulb className="w-4 h-4" /> 벤치마킹 인사이트
                </div>
                <div className="grid gap-3">
                  {analysis.insights?.map((insight: string, i: number) => (
                    <div key={i} className="flex gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm">
                      <Badge variant="secondary" className="h-5 shrink-0">{i + 1}</Badge>
                      <span className="break-words">{insight}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
