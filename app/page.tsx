'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Youtube, Download, BarChart2, List, Settings, Loader2, Trash2, ExternalLink, TrendingUp, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VideoList } from '@/components/video-list';
import { DownloadDialog } from '@/components/download-dialog';
import { AnalysisDialog } from '@/components/analysis-dialog';
import { SubtitleDialog } from '@/components/subtitle-dialog';
import { CommentsDialog } from '@/components/comments-dialog';
import { BatchProcessBar } from '@/components/batch-process-bar';
import { EnrichedVideo, VideoSearchFilters, YouTubeComment } from '@/lib/youtube';
import { SavedChannel } from '@/lib/storage';
import { AnalyzedVideo } from '@/lib/ai';
import { useSearch } from '@/store/search-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';

export default function Home() {
  const [activeTab, setActiveTab] = useState('search');
  const [savedChannels, setSavedChannels] = useState<SavedChannel[]>([]);
  const [selectedVideoForDownload, setSelectedVideoForDownload] = useState<{ id: string; title: string } | null>(null);

  const [selectedVideoForAnalysis, setSelectedVideoForAnalysis] = useState<EnrichedVideo | null>(null);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(false);

  const [selectedVideoForSubtitle, setSelectedVideoForSubtitle] = useState<EnrichedVideo | null>(null);
  const [isSubtitleOpen, setIsSubtitleOpen] = useState(false);

  const [selectedVideoForComments, setSelectedVideoForComments] = useState<EnrichedVideo | null>(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [comments, setComments] = useState<YouTubeComment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);

  // Batch Analysis State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [batchStatus, setBatchStatus] = useState({ total: 0, current: 0, success: 0, fail: 0 });
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);

  const fetchSavedChannels = async () => {
    try {
      const res = await fetch('/api/channels');
      const data = await res.json();
      if (data.channels) setSavedChannels(data.channels);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchSavedChannels();
  }, []);

  const handleToggleSave = async (channel: any) => {
    const isSaved = savedChannels.some(c => c.channelId === channel.channelId);
    const action = isSaved ? 'remove' : 'save';
    
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action, 
          channel: { ...channel, addedAt: new Date().toISOString() } 
        }),
      });
      const data = await res.json();
      if (data.channels) setSavedChannels(data.channels);
    } catch (e) { console.error(e); }
  };

  const handleAnalyze = async (video: EnrichedVideo, forceRefresh = false) => {
    setSelectedVideoForAnalysis(video);
    setIsAnalysisOpen(true);
    
    if (!forceRefresh) {
        setAnalysisResult(null);
        setIsAnalyzed(false);
    }
    
    setIsAnalyzing(true);

    try {
      if (!forceRefresh) {
        const checkRes = await fetch(`/api/analyzed-videos?videoId=${video.id}`);
        const { analysis } = await checkRes.json();

        if (analysis) {
          setAnalysisResult(analysis.analysisResult);
          setIsAnalyzed(true);
          setIsAnalyzing(false);
          return;
        }
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(video),
      });
      const data = await res.json();

      setAnalysisResult(data.analysis);
      setIsAnalyzed(true);

      fetch('/api/analyzed-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          videoId: video.id,
          video,
          analysisResult: data.analysis
        }),
      }).catch(e => console.error("Failed to save analysis:", e));

    } catch (e) {
      console.error(e);
      setAnalysisResult({ error: "분석 중 오류가 발생했습니다." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Batch Analysis Logic
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedVideoIds(new Set());
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideoIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  const handleBulkSelect = (videoIds: string[], select: boolean) => {
    setSelectedVideoIds(prev => {
      const newSet = new Set(prev);
      videoIds.forEach(id => {
        if (select) newSet.add(id);
        else newSet.delete(id);
      });
      return newSet;
    });
  };

  const handleBatchAnalyze = async (videosToAnalyze: EnrichedVideo[]) => {
    if (videosToAnalyze.length === 0) return;

    setIsBatchAnalyzing(true);
    setIsBatchDialogOpen(true);
    setBatchStatus({ total: videosToAnalyze.length, current: 0, success: 0, fail: 0 });
    
    // Setup AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Concurrency Limit (3 parallel requests)
    const CONCURRENCY = 3;
    
    // Process in chunks for better control
    for (let i = 0; i < videosToAnalyze.length; i += CONCURRENCY) {
        if (signal.aborted) break;

        const chunk = videosToAnalyze.slice(i, i + CONCURRENCY);
        
        await Promise.all(chunk.map(async (video) => {
            if (signal.aborted) return;

            try {
                // Check cache first
                const checkRes = await fetch(`/api/analyzed-videos?videoId=${video.id}`, { signal });
                const { analysis: cachedAnalysis } = await checkRes.json();

                if (signal.aborted) return;

                if (!cachedAnalysis) {
                    // New analysis
                    const res = await fetch('/api/analyze', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(video),
                        signal
                    });
                    const data = await res.json();
                    
                    if (data.analysis) {
                        // Save result (fire and forget)
                        fetch('/api/analyzed-videos', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'save',
                                videoId: video.id,
                                video,
                                analysisResult: data.analysis
                            }),
                        }).catch(e => console.error("Save failed:", e));
                        
                        setBatchStatus(prev => ({ ...prev, success: prev.success + 1 }));
                    } else {
                        setBatchStatus(prev => ({ ...prev, fail: prev.fail + 1 }));
                    }
                } else {
                    // Already analyzed
                    setBatchStatus(prev => ({ ...prev, success: prev.success + 1 }));
                }
            } catch (e: any) {
                if (e.name !== 'AbortError') {
                    console.error(`Failed to analyze video ${video.id}:`, e);
                    setBatchStatus(prev => ({ ...prev, fail: prev.fail + 1 }));
                }
            } finally {
                if (!signal.aborted) {
                    setBatchStatus(prev => ({ ...prev, current: prev.current + 1 }));
                }
            }
        }));
    }

    setIsBatchAnalyzing(false);
    abortControllerRef.current = null;
  };

  const cancelBatchAnalysis = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        setIsBatchAnalyzing(false);
    }
  };

  const handleViewSubtitle = (video: EnrichedVideo) => {
    setSelectedVideoForSubtitle(video);
    setIsSubtitleOpen(true);
  };

  const handleViewComments = async (video: EnrichedVideo) => {
    setSelectedVideoForComments(video);
    setIsCommentsOpen(true);
    setIsCommentsLoading(true);
    setComments([]);

    try {
      const res = await fetch(`/api/comments?videoId=${video.id}`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCommentsLoading(false);
    }
  };

  const handleRefreshAnalysis = () => {
    if (selectedVideoForAnalysis) {
      handleAnalyze(selectedVideoForAnalysis, true);
    }
  };

  const handleViewExistingAnalysis = (video: EnrichedVideo, existingAnalysis: any) => {
    setSelectedVideoForAnalysis(video);
    setAnalysisResult(existingAnalysis);
    setIsAnalyzed(true);
    setIsAnalyzing(false);
    setIsAnalysisOpen(true);
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold flex items-center gap-2 text-red-600">
            <Youtube className="w-6 h-6" />
            TubeSource
          </h1>
        </div>
        <ScrollArea className="flex-1 px-4">
          <nav className="space-y-2">
            <Button 
              variant={activeTab === 'search' ? 'secondary' : 'ghost'} 
              className="w-full justify-start" 
              onClick={() => setActiveTab('search')}
            >
              <Search className="mr-2 h-4 w-4" />
              영상 검색
            </Button>
            <Button 
              variant={activeTab === 'channels' ? 'secondary' : 'ghost'} 
              className="w-full justify-start"
              onClick={() => setActiveTab('channels')}
            >
              <List className="mr-2 h-4 w-4" />
              관심 채널
            </Button>
            <Button
              variant={activeTab === 'trends' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('trends')}
            >
              <BarChart2 className="mr-2 h-4 w-4" />
              트렌드 & 인사이트
            </Button>
            <Button
              variant={activeTab === 'analyzed' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('analyzed')}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              분석 결과
            </Button>
            <Button
              variant={activeTab === 'downloads' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('downloads')}
            >
              <Download className="mr-2 h-4 w-4" />
              다운로드
            </Button>
          </nav>
        </ScrollArea>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="mr-2 h-4 w-4" />
            설정
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col relative bg-slate-50 dark:bg-slate-900">
        <header className="h-16 border-b bg-white dark:bg-slate-950 flex items-center justify-between px-6 shrink-0 z-20">
          <h2 className="text-lg font-semibold capitalize">
            {activeTab === 'search' ? '영상 검색' : activeTab === 'channels' ? '관심 채널' : activeTab === 'trends' ? '트렌드 & 인사이트' : activeTab === 'analyzed' ? '분석 결과' : activeTab}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500">
              저장된 채널: <Badge variant="secondary">{savedChannels.length}</Badge>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {activeTab === 'search' && (
            <SearchSection
              savedChannelIds={savedChannels.map(c => c.channelId)}
              onToggleSave={handleToggleSave}
              onDownload={(v) => setSelectedVideoForDownload(v)}
              onAnalyze={handleAnalyze}
              onViewSubtitle={handleViewSubtitle}
              onViewComments={handleViewComments}
              // Batch Analysis Props
              isSelectionMode={isSelectionMode}
              selectedVideoIds={selectedVideoIds}
              onToggleSelectionMode={toggleSelectionMode}
              onToggleVideoSelection={toggleVideoSelection}
              onBulkSelect={handleBulkSelect}
              onBatchAnalyze={handleBatchAnalyze}
              batchProps={{
                isOpen: isBatchDialogOpen,
                isAnalyzing: isBatchAnalyzing,
                status: batchStatus,
                onClose: () => setIsBatchDialogOpen(false),
                onCancel: cancelBatchAnalysis
              }}
            />
          )}
          {activeTab === 'channels' && (
            <ChannelsSection 
              channels={savedChannels} 
              onRemove={(id) => handleToggleSave({ channelId: id })} 
            />
          )}
          {activeTab === 'trends' && (
            <TrendsSection
              savedChannelIds={savedChannels.map(c => c.channelId)}
              onToggleSave={handleToggleSave}
              onDownload={(v) => setSelectedVideoForDownload(v)}
              onAnalyze={handleAnalyze}
              onViewSubtitle={handleViewSubtitle}
              onViewComments={handleViewComments}
            />
          )}
          {activeTab === 'analyzed' && (
            <AnalyzedVideosSection
              onAnalyze={handleAnalyze}
              onViewExistingAnalysis={handleViewExistingAnalysis}
              onDownload={(v) => setSelectedVideoForDownload(v)}
              onViewSubtitle={handleViewSubtitle}
              onViewComments={handleViewComments}
            />
          )}
          {activeTab === 'downloads' && (
            <div className="text-center text-slate-500 mt-20">다운로드 기능 준비 중</div>
          )}
        </div>
      </main>

      <DownloadDialog 
        video={selectedVideoForDownload} 
        isOpen={!!selectedVideoForDownload} 
        onClose={() => setSelectedVideoForDownload(null)} 
      />

      <AnalysisDialog
        analysis={analysisResult}
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        videoTitle={selectedVideoForAnalysis?.title}
        isAnalyzing={isAnalyzing}
        isAnalyzed={isAnalyzed}
        onRefresh={handleRefreshAnalysis}
      />

      <SubtitleDialog
        subtitle={selectedVideoForSubtitle ? {
          videoId: selectedVideoForSubtitle.id,
          language: selectedVideoForSubtitle.subtitleLanguage || 'ko',
          text: selectedVideoForSubtitle.subtitleText || '',
          format: 'json3'
        } : null}
        isOpen={isSubtitleOpen}
        onClose={() => setIsSubtitleOpen(false)}
        videoTitle={selectedVideoForSubtitle?.title}
      />

      <CommentsDialog
        comments={comments}
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        videoTitle={selectedVideoForComments?.title}
        isLoading={isCommentsLoading}
      />
    </div>
  );
}

interface BatchProps {
  isOpen: boolean;
  isAnalyzing: boolean;
  status: { total: number; current: number; success: number; fail: number };
  onClose: () => void;
  onCancel: () => void;
}

function SearchSection({ 
  savedChannelIds, 
  onToggleSave, 
  onDownload, 
  onAnalyze, 
  onViewSubtitle, 
  onViewComments,
  isSelectionMode,
  selectedVideoIds,
  onToggleSelectionMode,
  onToggleVideoSelection,
  onBulkSelect,
  onBatchAnalyze,
  batchProps
}: {
  savedChannelIds: string[],
  onToggleSave: (c: any) => void,
  onDownload: (v: any) => void,
  onAnalyze: (v: EnrichedVideo) => void,
  onViewSubtitle: (v: EnrichedVideo) => void,
  onViewComments: (v: EnrichedVideo) => void,
  isSelectionMode?: boolean,
  selectedVideoIds?: Set<string>,
  onToggleSelectionMode?: () => void,
  onToggleVideoSelection?: (id: string) => void,
  onBulkSelect?: (ids: string[], select: boolean) => void,
  onBatchAnalyze?: (videos: EnrichedVideo[]) => void,
  batchProps?: BatchProps
}) {
  const {
    query, setQuery,
    filters, setFilters,
    videos,
    timePeriod, setTimePeriod,
    sortBy, setSortBy,
    allVideos, setAllVideos,
    loading, setLoading,
    applySorting,
    setHasSearched,
  } = useSearch();

  // Calculate publishedAfter based on time period
  const getPublishedAfter = (period: string): string | undefined => {
    if (period === 'all') return undefined;

    const now = new Date();
    const periods: Record<string, number> = {
      '1d': 1,
      '1w': 7,
      '1m': 30,
      '3m': 90,
      '6m': 180,
      '1y': 365,
    };

    const daysAgo = periods[period];
    if (!daysAgo) return undefined;

    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return date.toISOString();
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setAllVideos([]);

    try {
      const searchFilters = {
        q: query,
        ...filters,
        publishedAfter: getPublishedAfter(timePeriod),
      };

      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: searchFilters }),
      });
      const data = await res.json();

      if (data.videos) {
        setAllVideos(data.videos);
        applySorting(data.videos, sortBy);
        setHasSearched(true);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (allVideos.length > 0) {
      applySorting(allVideos, sortBy);
    }
  }, [sortBy, allVideos, applySorting]);

  // Batch Select Helper
  const handleSelectAll = () => {
    if (!onBulkSelect || !selectedVideoIds) return;
    const allSelected = videos.every(v => selectedVideoIds.has(v.id));
    const allIds = videos.map(v => v.id);
    
    if (allSelected) {
        onBulkSelect(allIds, false); // Deselect all
    } else {
        onBulkSelect(allIds, true); // Select all
    }
  };

  const startBatchAnalysis = () => {
    if (!onBatchAnalyze || !selectedVideoIds) return;
    const selectedVideos = videos.filter(v => selectedVideoIds.has(v.id));
    onBatchAnalyze(selectedVideos);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* 검색어 & 검색 버튼 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="유튜브 영상 검색..."
                className="pl-10 h-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading} size="default" className="h-10 px-6">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">검색</span>
            </Button>
          </div>

          {/* 필터 그룹 */}
          <div className="flex flex-wrap items-end gap-3 sm:gap-4 border-t pt-4">
            <div className="flex flex-col gap-1 min-w-[100px] flex-1 sm:flex-none">
              <Label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider ml-0.5">국가</Label>
              <Select value={filters.regionCode} onValueChange={(v) => setFilters({...filters, regionCode: v})}>
                <SelectTrigger className="h-8 w-full sm:w-[120px]">
                  <SelectValue placeholder="전체 국가" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 국가</SelectItem>
                  <SelectItem value="KR">🇰🇷 한국</SelectItem>
                  <SelectItem value="US">🇺🇸 미국</SelectItem>
                  <SelectItem value="JP">🇯🇵 일본</SelectItem>
                  <SelectItem value="GB">🇬🇧 영국</SelectItem>
                  <SelectItem value="IN">🇮🇳 인도</SelectItem>
                  <SelectItem value="CN">🇨🇳 중국</SelectItem>
                  <SelectItem value="FR">🇫🇷 프랑스</SelectItem>
                  <SelectItem value="DE">🇩🇪 독일</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1 min-w-[100px] flex-1 sm:flex-none">
              <Label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider ml-0.5">길이</Label>
              <Select value={filters.videoDuration} onValueChange={(v) => setFilters({...filters, videoDuration: v as any})}>
                <SelectTrigger className="h-8 w-full sm:w-[120px]">
                  <SelectValue placeholder="모든 길이" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">모든 길이</SelectItem>
                  <SelectItem value="short">쇼츠 (&lt; 4분)</SelectItem>
                  <SelectItem value="medium">미디엄 (4-20분)</SelectItem>
                  <SelectItem value="long">롱폼 (&gt; 20분)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1 min-w-[100px] flex-1 sm:flex-none">
              <Label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider ml-0.5">기간</Label>
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="h-8 w-full sm:w-[110px]">
                  <SelectValue placeholder="모든 기간" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 기간</SelectItem>
                  <SelectItem value="1d">1일 이내</SelectItem>
                  <SelectItem value="1w">1주일 이내</SelectItem>
                  <SelectItem value="1m">1개월 이내</SelectItem>
                  <SelectItem value="3m">3개월 이내</SelectItem>
                  <SelectItem value="6m">6개월 이내</SelectItem>
                  <SelectItem value="1y">1년 이내</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1 min-w-[70px] flex-1 sm:flex-none">
              <Label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider ml-0.5">개수</Label>
              <Select value={String(filters.maxResults)} onValueChange={(v) => setFilters({...filters, maxResults: Number(v)})}>
                <SelectTrigger className="h-8 w-full sm:w-[80px]">
                  <SelectValue placeholder="개수" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10개</SelectItem>
                  <SelectItem value="20">20개</SelectItem>
                  <SelectItem value="30">30개</SelectItem>
                  <SelectItem value="50">50개</SelectItem>
                  <SelectItem value="100">100개</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1 min-w-[100px] flex-1 sm:flex-none">
              <Label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider ml-0.5">구독자 (Min)</Label>
              <Input 
                type="number" 
                placeholder="최소 구독자" 
                className="h-8 text-xs" 
                value={filters.minSubscribers || ''}
                onChange={(e) => setFilters({...filters, minSubscribers: e.target.value ? Number(e.target.value) : undefined})}
              />
            </div>

            <div className="flex flex-col gap-1 min-w-[100px] flex-1 sm:flex-none">
              <Label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider ml-0.5">구독자 (Max)</Label>
              <Input 
                type="number" 
                placeholder="최대 구독자" 
                className="h-8 text-xs" 
                value={filters.maxSubscribers || ''}
                onChange={(e) => setFilters({...filters, maxSubscribers: e.target.value ? Number(e.target.value) : undefined})}
              />
            </div>

            <div className="flex flex-col gap-1 min-w-[100px] flex-1 sm:flex-none">
              <Label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider ml-0.5">성과도 (Min %)</Label>
              <Input 
                type="number" 
                placeholder="최소 성과도" 
                className="h-8 text-xs" 
                value={filters.minPerformanceRatio || ''}
                onChange={(e) => setFilters({...filters, minPerformanceRatio: e.target.value ? Number(e.target.value) : undefined})}
              />
            </div>

            <div className="flex flex-col gap-1 min-w-[100px] flex-1 sm:flex-none">
              <Label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider ml-0.5">정렬</Label>
              <Select value={filters.order} onValueChange={(v) => setFilters({...filters, order: v as any})}>
                <SelectTrigger className="h-8 w-full sm:w-[110px]">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">관련성순</SelectItem>
                  <SelectItem value="date">최신순</SelectItem>
                  <SelectItem value="viewCount">조회수순</SelectItem>
                  <SelectItem value="rating">평점순</SelectItem>
                  <SelectItem value="title">제목순</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 h-8 ml-auto pr-1">
              <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-3 h-3 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  checked={filters.creativeCommons || false}
                  onChange={(e) => setFilters({...filters, creativeCommons: e.target.checked})}
                />
                CC
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-3 h-3 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  checked={filters.fetchSubtitles !== false}
                  onChange={(e) => setFilters({...filters, fetchSubtitles: e.target.checked})}
                />
                자막
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 결과 정렬 버튼 & 일괄 분석 툴바 */}
      {allVideos.length > 0 && (
        <Card className="bg-slate-50/50 dark:bg-slate-900/50 border-dashed">
          <CardContent className="py-1.5 px-3">
            <div className="flex flex-wrap gap-2 items-center">
              
              {/* Sort Buttons */}
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2 ml-1 shrink-0">심화 정렬</span>
                <Button variant={sortBy === 'none' ? 'default' : 'ghost'} size="sm" className="h-6 text-[11px] px-2" onClick={() => setSortBy('none')}>기본</Button>
                <Button variant={sortBy === 'views' ? 'default' : 'ghost'} size="sm" className="h-6 text-[11px] px-2" onClick={() => setSortBy('views')}>조회수</Button>
                <Button variant={sortBy === 'subscribers' ? 'default' : 'ghost'} size="sm" className="h-6 text-[11px] px-2" onClick={() => setSortBy('subscribers')}>구독자</Button>
                <Button variant={sortBy === 'performance' ? 'default' : 'ghost'} size="sm" className="h-6 text-[11px] px-2" onClick={() => setSortBy('performance')}>성과도</Button>
                <Button variant={sortBy === 'engagement' ? 'default' : 'ghost'} size="sm" className="h-6 text-[11px] px-2" onClick={() => setSortBy('engagement')}>참여율</Button>
                <Button variant={sortBy === 'likes' ? 'default' : 'ghost'} size="sm" className="h-6 text-[11px] px-2" onClick={() => setSortBy('likes')}>좋아요</Button>
                <Button variant={sortBy === 'comments' ? 'default' : 'ghost'} size="sm" className="h-6 text-[11px] px-2" onClick={() => setSortBy('comments')}>댓글</Button>
              </div>

              {/* Batch Actions Group - Pushed to right */}
              {onToggleSelectionMode && (
                <div className="ml-auto flex items-center gap-2">
                  <div className="text-[10px] text-slate-400 font-medium pr-1 shrink-0 hidden sm:block">총 {videos.length}개</div>
                  {isSelectionMode ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-4 duration-300">
                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-slate-500" onClick={onToggleSelectionMode}>
                        취소
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs px-3 border-red-200 text-red-700 dark:border-red-900 dark:text-red-400" onClick={handleSelectAll}>
                        {selectedVideoIds && selectedVideoIds.size === videos.length ? '전체 해제' : '전체 선택'}
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="h-7 text-xs px-4 !bg-red-600 !hover:bg-red-700 !text-white font-bold shadow-sm disabled:!bg-red-200 disabled:!text-white/80 disabled:!opacity-100 transition-colors" 
                        onClick={startBatchAnalysis}
                        disabled={!selectedVideoIds || selectedVideoIds.size === 0}
                      >
                        <Sparkles className="w-3 h-3 mr-1.5 fill-white" />
                        분석 ({selectedVideoIds?.size || 0})
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs px-3 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors"
                      onClick={onToggleSelectionMode}
                    >
                      <List className="w-3 h-3 mr-1.5" />
                      일괄 AI 분석
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Process Bar */}
      {batchProps?.isOpen && (
        <BatchProcessBar
          total={batchProps.status.total}
          current={batchProps.status.current}
          successCount={batchProps.status.success}
          failCount={batchProps.status.fail}
          isAnalyzing={batchProps.isAnalyzing}
          onClose={batchProps.onClose}
          onCancel={batchProps.onCancel}
        />
      )}

      <VideoList
        videos={videos}
        loading={loading}
        savedChannelIds={savedChannelIds}
        onToggleSave={onToggleSave}
        onDownload={onDownload}
        onAnalyze={onAnalyze}
        onViewSubtitle={onViewSubtitle}
        onViewComments={onViewComments}
        selectionMode={isSelectionMode}
        selectedVideoIds={selectedVideoIds}
        onSelectVideo={onToggleVideoSelection}
      />
    </div>
  );
}

function ChannelsSection({ channels, onRemove }: { channels: SavedChannel[], onRemove: (id: string) => void }) {
  return (
    <div className="space-y-4">
      {channels.length === 0 ? (
        <div className="text-center py-20 text-slate-500">저장된 채널이 없습니다. 검색 결과에서 별 아이콘을 클릭해 추가해보세요.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map(channel => (
            <Card key={channel.channelId} className="flex items-center p-4 gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                {channel.thumbnail ? <img src={channel.thumbnail} alt="" /> : <Youtube className="w-full h-full p-3 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{channel.channelTitle}</h3>
                <p className="text-[10px] text-slate-400">추가일: {new Date(channel.addedAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => onRemove(channel.channelId)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" asChild>
                  <a href={`https://youtube.com/channel/${channel.channelId}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendsSection({ savedChannelIds, onToggleSave, onDownload, onAnalyze, onViewSubtitle, onViewComments }: {
  savedChannelIds: string[],
  onToggleSave: (c: any) => void,
  onDownload: (v: any) => void,
  onAnalyze: (v: EnrichedVideo) => void,
  onViewSubtitle: (v: EnrichedVideo) => void,
  onViewComments: (v: EnrichedVideo) => void
}) {
  const [regionCode, setRegionCode] = useState('KR');
  const [categoryId, setCategoryId] = useState('0');
  const [videos, setVideos] = useState<EnrichedVideo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrends();
  }, [regionCode, categoryId]);

  const fetchTrends = async () => {
    setLoading(true);
    setVideos([]);
    try {
      const res = await fetch(`/api/trends?regionCode=${regionCode}&videoCategoryId=${categoryId}`);
      const data = await res.json();
      if (data.videos) setVideos(data.videos);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-bold">실시간 인기 동영상</h2>
        </div>
        <div className="flex gap-2">
           <select 
              className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 dark:border-slate-800 dark:bg-slate-950"
              value={regionCode}
              onChange={(e) => setRegionCode(e.target.value)}
            >
              <option value="KR">🇰🇷 한국</option>
              <option value="US">🇺🇸 미국</option>
              <option value="JP">🇯🇵 일본</option>
              <option value="GB">🇬🇧 영국</option>
              <option value="IN">🇮🇳 인도</option>
            </select>
            <select 
              className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 dark:border-slate-800 dark:bg-slate-950"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="0">모든 카테고리</option>
              <option value="10">🎵 음악</option>
              <option value="20">🎮 게임</option>
              <option value="1">🎬 영화/애니</option>
              <option value="17">⚽ 스포츠</option>
              <option value="23">🤣 코미디</option>
              <option value="25">📰 뉴스/정치</option>
              <option value="24">📺 엔터테인먼트</option>
            </select>
        </div>
      </div>

      <VideoList
        videos={videos}
        loading={loading}
        savedChannelIds={savedChannelIds}
        onToggleSave={onToggleSave}
        onDownload={onDownload}
        onAnalyze={onAnalyze}
        onViewSubtitle={onViewSubtitle}
        onViewComments={onViewComments}
      />
    </div>
  );
}
function AnalyzedVideosSection({
  onAnalyze,
  onViewExistingAnalysis,
  onDownload,
  onViewSubtitle,
  onViewComments
}: {
  onAnalyze: (v: EnrichedVideo) => void,
  onViewExistingAnalysis: (v: EnrichedVideo, analysis: any) => void,
  onDownload: (v: any) => void,
  onViewSubtitle: (v: EnrichedVideo) => void,
  onViewComments: (v: EnrichedVideo) => void
}) {
  const [analyzedVideos, setAnalyzedVideos] = useState<AnalyzedVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyzedVideos();
  }, []);

  const loadAnalyzedVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analyzed-videos');
      const { videos } = await res.json();
      setAnalyzedVideos(videos || []);
    } catch (error) {
      console.error('Failed to load analyzed videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnalysis = async (videoId: string) => {
    try {
      await fetch('/api/analyzed-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', videoId }),
      });
      loadAnalyzedVideos();
    } catch (error) {
      console.error('Failed to delete analysis:', error);
    }
  };

  const handleViewAnalysis = (video: EnrichedVideo) => {
    // 원본 analyzedVideos 배열에서 실제 분석 결과 찾기
    const analyzedVideo = analyzedVideos.find(v => v.videoId === video.id);

    if (analyzedVideo?.analysisResult) {
      // 이미 분석된 결과가 있으므로 API 호출 없이 바로 표시
      onViewExistingAnalysis(video, analyzedVideo.analysisResult);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (analyzedVideos.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500">
        아직 분석된 영상이 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          총 {analyzedVideos.length}개의 분석된 영상
        </p>
      </div>
      <VideoList
        videos={analyzedVideos.map(v => ({
          id: v.videoId,
          title: v.title,
          channelTitle: v.channelTitle,
          channelId: v.channelId,
          channelThumbnail: '',
          thumbnail: v.thumbnail,
          viewCount: v.viewCount,
          likeCount: v.likeCount,
          commentCount: 0,
          subscriberCount: v.subscriberCount,
          engagementRate: v.engagementRate,
          performanceRatio: v.performanceRatio,
          publishedAt: v.analyzedAt,
          description: '',
          duration: '',
          caption: false,
          channelVideoCount: 0,
          channelViewCount: 0,
        }))}
        loading={loading}
        savedChannelIds={[]}
        onToggleSave={() => {}}
        onDownload={onDownload}
        onAnalyze={handleViewAnalysis}
        onViewSubtitle={onViewSubtitle}
        onViewComments={onViewComments}
        onDeleteAnalysis={handleDeleteAnalysis}
      />
    </div>
  );
}