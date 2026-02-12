"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  ChevronsUpDown,
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
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set()); // 모든 라인 자동 펼침 (초기화 시 설정)
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

      // 새로 추가된 모든 라인 자동 펼침
      if (data.results.length > 0) {
        setExpandedLines(prev => new Set([...prev, ...data.results.map((r: LineSearchResults) => r.line)]));
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
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchFootageResults(currentStart);
    }
  }, [isLoading, hasMore, currentStart]);

  /**
   * 무한 스크롤 - IntersectionObserver
   */
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

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
   * 모두 펼치기/접기 토글
   */
  const toggleAllLines = () => {
    if (expandedLines.size === results.length) {
      // 모두 펼쳐있으면 접기
      setExpandedLines(new Set());
    } else {
      // 일부만 펼쳐있으면 모두 펼치기
      setExpandedLines(new Set(results.map(r => r.line)));
    }
  };

  /**
   * 특정 라인 재검색 (에러 발생 시)
   */
  const [retryingLines, setRetryingLines] = useState<Set<number>>(new Set());

  const retryLine = async (lineNumber: number) => {
    // 이미 재시도 중이면 무시
    if (retryingLines.has(lineNumber)) return;

    setRetryingLines(prev => new Set([...prev, lineNumber]));

    try {
      const response = await fetch('/api/footage-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtitleText,
          startLine: lineNumber - 1, // 0-based index
          count: 1
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // 해당 라인 결과 업데이트
      if (data.results.length > 0) {
        setResults(prev => prev.map(r =>
          r.line === lineNumber ? data.results[0] : r
        ));
      }
    } catch (err: any) {
      console.error('Retry failed:', err);
    } finally {
      setRetryingLines(prev => {
        const newSet = new Set(prev);
        newSet.delete(lineNumber);
        return newSet;
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-muted/30 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileVideo className="w-6 h-6 text-purple-500" />
              자료화면 검색
            </DialogTitle>
            {results.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllLines}
                className="shrink-0"
              >
                <ChevronsUpDown className="w-4 h-4 mr-1" />
                {expandedLines.size === results.length ? "모두 접기" : "모두 펼치기"}
              </Button>
            )}
          </div>
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
              <div className="text-center">
                <p className="text-muted-foreground mb-2">
                  Gemini AI가 키워드를 추출하고 자료화면을 검색 중입니다...
                </p>
                <p className="text-sm text-muted-foreground/70">
                  첫 로드는 3~5초 정도 걸릴 수 있습니다
                </p>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-6">
              {results.map((lineResult) => (
                <LineResultSection
                  key={lineResult.line}
                  lineResult={lineResult}
                  isExpanded={expandedLines.has(lineResult.line)}
                  isRetrying={retryingLines.has(lineResult.line)}
                  onToggle={() => toggleLine(lineResult.line)}
                  onRetry={() => retryLine(lineResult.line)}
                />
              ))}

              {/* 무한 스크롤 트리거 */}
              <div ref={loadMoreRef} className="py-4">
                {isLoading && results.length > 0 && (
                  <div className="flex items-center justify-center gap-3 py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">
                      다음 라인 불러오는 중... ({currentStart}/{totalLines})
                    </span>
                  </div>
                )}
                {!isLoading && hasMore && (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    스크롤하여 더 보기 ({currentStart}/{totalLines} 라인)
                  </p>
                )}
                {!hasMore && results.length > 0 && (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    모든 라인을 불러왔습니다 ({totalLines}개)
                  </p>
                )}
              </div>
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
  isRetrying: boolean;
  onToggle: () => void;
  onRetry: () => void;
}

function LineResultSection({ lineResult, isExpanded, isRetrying, onToggle, onRetry }: LineResultSectionProps) {
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
          {/* 재시도 중 오버레이 */}
          {isRetrying && (
            <div className="flex items-center justify-center gap-3 py-8 border rounded-lg bg-muted/30">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                이 라인을 다시 검색하는 중...
              </span>
            </div>
          )}

          {!isRetrying && (
            <>
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
            </>
          )}
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
