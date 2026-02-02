"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FootageResultCard } from "@/components/footage-result-card";
import { LineSearchResults, FootageSearchResult } from "@/lib/footage-search";
import {
  FileVideo,
  Loader2,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Film,
  Search,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FootageSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  videoTitle: string;
  subtitleText: string;
}

export function FootageSearchDialog({
  isOpen,
  onClose,
  videoTitle,
  subtitleText
}: FootageSearchDialogProps) {
  const [results, setResults] = useState<LineSearchResults[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set([1])); // 첫 번째 라인만 펼침
  const [currentStart, setCurrentStart] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalLines, setTotalLines] = useState(0);

  const LINES_PER_PAGE = 5;

  // Dialog 열릴 때 첫 5개 라인 자동 검색
  useEffect(() => {
    if (isOpen && subtitleText && results.length === 0) {
      fetchFootageResults(0);
    }
  }, [isOpen, subtitleText]);

  /**
   * 자료화면 검색 API 호출
   */
  const fetchFootageResults = async (startLine: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/footage-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtitleText,
          startLine,
          count: LINES_PER_PAGE
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // 결과 추가 (페이지네이션)
      setResults(prev => [...prev, ...data.results]);
      setHasMore(data.hasMore);
      setTotalLines(data.totalLines);
      setCurrentStart(data.currentRange.end);

      // 새로 추가된 첫 번째 라인 자동 펼침
      if (data.results.length > 0) {
        setExpandedLines(prev => new Set([...prev, data.results[0].line]));
      }

    } catch (err: any) {
      console.error('Footage search failed:', err);
      setError(err.message || '검색 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 다음 5개 라인 불러오기
   */
  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchFootageResults(currentStart);
    }
  };

  /**
   * 라인 펼치기/접기 토글
   */
  const toggleLine = (lineNumber: number) => {
    setExpandedLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lineNumber)) {
        newSet.delete(lineNumber);
      } else {
        newSet.add(lineNumber);
      }
      return newSet;
    });
  };

  /**
   * 특정 라인 재검색 (에러 발생 시)
   */
  const retryLine = async (lineNumber: number) => {
    // TODO: 단일 라인 재검색 구현 (선택사항)
    console.log('Retry line:', lineNumber);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-muted/30 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileVideo className="w-6 h-6 text-purple-500" />
            자료화면 검색
          </DialogTitle>
          <DialogDescription className="line-clamp-1">
            {videoTitle}
          </DialogDescription>
        </DialogHeader>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {error && (
            <div className="p-4 mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">오류 발생</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {results.length === 0 && isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground">
                Gemini AI가 키워드를 추출하고 자료화면을 검색 중입니다...
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-6">
              {results.map((lineResult) => (
                <LineResultSection
                  key={lineResult.line}
                  lineResult={lineResult}
                  isExpanded={expandedLines.has(lineResult.line)}
                  onToggle={() => toggleLine(lineResult.line)}
                  onRetry={() => retryLine(lineResult.line)}
                />
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="flex flex-col items-center gap-2 py-6">
                  <Button
                    onClick={loadMore}
                    disabled={isLoading}
                    variant="outline"
                    className="min-w-[200px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        로딩 중...
                      </>
                    ) : (
                      <>
                        다음 {Math.min(LINES_PER_PAGE, totalLines - currentStart)}개 라인 불러오기
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    {currentStart}/{totalLines} 라인
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-6 pt-4 border-t bg-muted/30 shrink-0">
          <Button onClick={onClose}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================
// Line Result Section Component
// =====================

interface LineResultSectionProps {
  lineResult: LineSearchResults;
  isExpanded: boolean;
  onToggle: () => void;
  onRetry: () => void;
}

function LineResultSection({ lineResult, isExpanded, onToggle, onRetry }: LineResultSectionProps) {
  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Line Header - Clickable */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start justify-between hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="shrink-0">
              라인 {lineResult.line}
            </Badge>
            <p className="text-sm font-medium truncate">{lineResult.text}</p>
          </div>

          {/* Keywords */}
          <div className="flex flex-wrap gap-1.5">
            {lineResult.keywords.korean.map((kw, idx) => (
              <Badge key={`ko-${idx}`} variant="secondary" className="text-xs">
                {kw}
              </Badge>
            ))}
            {lineResult.keywords.english.map((kw, idx) => (
              <Badge key={`en-${idx}`} variant="outline" className="text-xs">
                {kw}
              </Badge>
            ))}
          </div>
        </div>

        {/* Expand Icon */}
        <div className="ml-4 shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-6">
          {/* Unsplash Section */}
          <SourceSection
            title="Unsplash"
            icon={ImageIcon}
            iconColor="text-blue-500"
            results={lineResult.results.unsplash}
            onRetry={onRetry}
          />

          {/* Pexels Section */}
          <SourceSection
            title="Pexels"
            icon={Film}
            iconColor="text-green-500"
            results={lineResult.results.pexels}
            onRetry={onRetry}
          />

          {/* Google Section */}
          <SourceSection
            title="Google"
            icon={Search}
            iconColor="text-red-500"
            results={lineResult.results.google}
            onRetry={onRetry}
          />
        </div>
      )}
    </div>
  );
}

// =====================
// Source Section Component
// =====================

interface SourceSectionProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  results: FootageSearchResult[] | { error: string };
  onRetry: () => void;
}

function SourceSection({ title, icon: Icon, iconColor, results, onRetry }: SourceSectionProps) {
  // Error case
  if ('error' in results) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Icon className={cn("w-5 h-5", iconColor)} />
          <h4 className="font-semibold">{title}</h4>
        </div>
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{results.error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="w-3 h-3 mr-1" />
            재시도
          </Button>
        </div>
      </div>
    );
  }

  // Empty case
  if (results.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Icon className={cn("w-5 h-5", iconColor)} />
          <h4 className="font-semibold">{title}</h4>
        </div>
        <div className="p-4 rounded-lg border border-muted bg-muted/30 text-sm text-muted-foreground text-center">
          검색 결과가 없습니다
        </div>
      </div>
    );
  }

  // Success case - Grid of results
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("w-5 h-5", iconColor)} />
        <h4 className="font-semibold">{title}</h4>
        <Badge variant="secondary" className="text-xs">
          {results.length}개
        </Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {results.map((result) => (
          <FootageResultCard key={result.id} result={result} />
        ))}
      </div>
    </div>
  );
}
