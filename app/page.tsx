'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Youtube, Download, BarChart2, List, Settings, Loader2, Trash2, ExternalLink, TrendingUp, Sparkles, Layers, User, FileVideo, Music, Tag, Plus, FolderOpen, MoreVertical, LayoutGrid, Check, X, FileText, Printer } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VideoList } from '@/components/video-list';
import { DownloadDialog } from '@/components/download-dialog';
import { AnalysisDialog } from '@/components/analysis-dialog';
import { SubtitleDialog } from '@/components/subtitle-dialog';
import { CommentsDialog } from '@/components/comments-dialog';
import { FootageSearchDialog } from '@/components/footage-search-dialog';
import { EnrichedVideo, VideoSearchFilters, YouTubeComment } from '@/lib/youtube';
import { SavedChannel } from '@/lib/storage';
import { AnalyzedVideo } from '@/lib/ai';
import { useSearch } from '@/store/search-context';
import { useChannelSearch } from '@/store/channel-search-context';
import { ChannelDetailDialog } from '@/components/channel-detail-dialog';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { BatchProcessStack } from '@/components/batch-process-stack';

// BatchJob 인터페이스 - 다중 분석 작업 관리
export interface BatchJob {
  id: string;
  label: string;
  status: 'running' | 'completed' | 'cancelled';
  progress: {
    total: number;
    current: number;
    success: number;
    fail: number;
  };
  abortController: AbortController;
  startedAt: Date;
}

export default function Home() {
  const { setSelectedChannel } = useChannelSearch();
  const [activeTab, setActiveTab] = useState('search');
  const [savedChannels, setSavedChannels] = useState<SavedChannel[]>([]);
  const [selectedVideoForDownload, setSelectedVideoForDownload] = useState<{ id: string; title: string } | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [isUrlDownloadOpen, setIsUrlDownloadOpen] = useState(false);
  const [activeDownloads, setActiveDownloads] = useState<any[]>([]);
  
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkUrls, setBulkUrls] = useState<string[]>([]);

  const handleDownloadStart = (info: any) => {
    // Check if it's a single info or array of info
    const infoArray = Array.isArray(info) ? info : [info];
    
    infoArray.forEach(item => {
      const downloadId = item.id + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const newDownload = {
        ...item,
        uniqueId: downloadId,
        status: 'starting',
        progress: 0,
        message: '준비 중...'
      };
      
      setActiveDownloads(prev => [newDownload, ...prev]);

      const queryParams = new URLSearchParams();
      if (item.videoId) queryParams.set("videoId", item.videoId);
      if (item.url) queryParams.set("url", item.url);
      queryParams.set("format", item.format);

      const eventSource = new EventSource(`/api/download?${queryParams.toString()}`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        setActiveDownloads(prev => prev.map(d => {
          if (d.uniqueId === downloadId) {
            if (data.status === "title") {
              return { ...d, title: data.title };
            } else if (data.status === "progress") {
              const percent = parseFloat(data.progress.replace("%", ""));
              return { ...d, status: 'downloading', progress: percent, message: data.message };
            } else if (data.status === "completed") {
              eventSource.close();
              return { ...d, status: 'completed', progress: 100, message: '완료!' };
            } else if (data.status === "error") {
              eventSource.close();
              return { ...d, status: 'error', message: `에러: ${data.message}` };
            }
          }
          return d;
        }));
      };

      eventSource.onerror = () => {
        setActiveDownloads(prev => prev.map(d => 
          d.uniqueId === downloadId ? { ...d, status: 'error', message: '서버 연결 실패' } : d
        ));
        eventSource.close();
      };
    });
  };

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

  // Footage Search State (direct subtitle input)
  const [footageSubtitleInput, setFootageSubtitleInput] = useState('');
  const [isFootageSearchOpen, setIsFootageSearchOpen] = useState(false);

  // Channel Details State
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [isChannelDetailOpen, setIsChannelDetailOpen] = useState(false);

  // Batch Analysis State - 다중 작업 지원
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);

  // 배치 작업 관리 함수들
  const addBatchJob = (videos: EnrichedVideo[], label?: string): BatchJob => {
    const jobId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newJob: BatchJob = {
      id: jobId,
      label: label || `분석 작업 (${videos.length}개)`,
      status: 'running',
      progress: { total: videos.length, current: 0, success: 0, fail: 0 },
      abortController: new AbortController(),
      startedAt: new Date(),
    };
    setBatchJobs(prev => [newJob, ...prev]);
    return newJob;
  };

  const updateBatchProgress = (
    jobId: string,
    update: Partial<BatchJob['progress']> | ((prev: BatchJob['progress']) => Partial<BatchJob['progress']>)
  ) => {
    setBatchJobs(prev => prev.map(job => {
      if (job.id !== jobId) return job;
      const changes = typeof update === 'function' ? update(job.progress) : update;
      return { ...job, progress: { ...job.progress, ...changes } };
    }));
  };

  const updateBatchJobStatus = (jobId: string, status: BatchJob['status']) => {
    setBatchJobs(prev => prev.map(job =>
      job.id === jobId ? { ...job, status } : job
    ));
  };

  const cancelBatchJob = (jobId: string) => {
    setBatchJobs(prev => prev.map(job => {
      if (job.id !== jobId) return job;
      job.abortController.abort();
      return { ...job, status: 'cancelled' };
    }));
  };

  const removeBatchJob = (jobId: string) => {
    setBatchJobs(prev => prev.filter(job => job.id !== jobId));
  };

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

  const handleUpdateChannel = async (channel: SavedChannel) => {
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'save', 
          channel 
        }),
      });
      const data = await res.json();
      if (data.channels) setSavedChannels(data.channels);
    } catch (e) { console.error(e); }
  };

  const handleChannelClick = (channelId: string) => {
    setSelectedChannelId(channelId);
    setIsChannelDetailOpen(true);
  };

  const handleLoadChannelToSearch = (channelId: string, channelTitle: string) => {
    setSelectedChannel({ id: channelId, title: channelTitle });
    setActiveTab('channel_search');
    setIsChannelDetailOpen(false);
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

  const handleBatchAnalyze = async (videosToAnalyze: EnrichedVideo[], sourceLabel?: string) => {
    if (videosToAnalyze.length === 0) return;

    // 선택 모드 종료 및 선택 초기화
    setIsSelectionMode(false);
    setSelectedVideoIds(new Set());

    // 새 배치 작업 생성
    const newJob = addBatchJob(videosToAnalyze, sourceLabel);
    const { abortController, id: jobId } = newJob;
    const signal = abortController.signal;

    // 다른 작업이 진행 중이면 동시성 줄임
    const runningJobsCount = batchJobs.filter(j => j.status === 'running').length;
    const CONCURRENCY = runningJobsCount > 0 ? 2 : 3;

    // 청크 단위 처리
    for (let i = 0; i < videosToAnalyze.length; i += CONCURRENCY) {
      if (signal.aborted) break;

      const chunk = videosToAnalyze.slice(i, i + CONCURRENCY);

      await Promise.all(chunk.map(async (video) => {
        if (signal.aborted) return;

        try {
          // 캐시 확인
          const checkRes = await fetch(`/api/analyzed-videos?videoId=${video.id}`, { signal });
          const { analysis: cachedAnalysis } = await checkRes.json();

          if (signal.aborted) return;

          if (!cachedAnalysis) {
            // 새 분석 요청
            const res = await fetch('/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(video),
              signal
            });
            const data = await res.json();

            if (data.analysis) {
              // 결과 저장 (fire and forget)
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

              updateBatchProgress(jobId, prev => ({ success: prev.success + 1 }));
            } else {
              updateBatchProgress(jobId, prev => ({ fail: prev.fail + 1 }));
            }
          } else {
            // 이미 분석됨
            updateBatchProgress(jobId, prev => ({ success: prev.success + 1 }));
          }
        } catch (e: any) {
          if (e.name !== 'AbortError') {
            console.error(`Failed to analyze video ${video.id}:`, e);
            updateBatchProgress(jobId, prev => ({ fail: prev.fail + 1 }));
          }
        } finally {
          if (!signal.aborted) {
            updateBatchProgress(jobId, prev => ({ current: prev.current + 1 }));
          }
        }
      }));
    }

    // 완료 처리
    updateBatchJobStatus(jobId, signal.aborted ? 'cancelled' : 'completed');
  };

  const handleContextAnalyze = async (videosToAnalyze: EnrichedVideo[]) => {
    if (videosToAnalyze.length === 0) return;

    setIsSelectionMode(false);
    setIsAnalyzing(true);
    setIsAnalysisOpen(true);
    setAnalysisResult(null);
    setSelectedVideoForAnalysis({
      ...videosToAnalyze[0],
      title: `Context Analysis (${videosToAnalyze.length} videos)`,
      channelTitle: 'Multiple Channels'
    });

    try {
      const res = await fetch('/api/analyze/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videos: videosToAnalyze }),
      });
      const data = await res.json();

      if (data.analysis) {
        setAnalysisResult(data.analysis);
        setIsAnalyzed(true);

        // Save Context Analysis
        fetch('/api/analyzed-videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_context',
            videos: videosToAnalyze,
            analysisResult: data.analysis
          }),
        }).catch(e => console.error("Failed to save context analysis:", e));
      } else {
        setAnalysisResult({ error: "분석에 실패했습니다." });
      }
    } catch (e) {
      console.error(e);
      setAnalysisResult({ error: "분석 중 오류가 발생했습니다." });
    } finally {
      setIsAnalyzing(false);
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
              variant={activeTab === 'channel_search' ? 'secondary' : 'ghost'} 
              className="w-full justify-start" 
              onClick={() => setActiveTab('channel_search')}
            >
              <User className="mr-2 h-4 w-4" />
              채널 검색
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
            <Button
              variant={activeTab === 'footage_search' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('footage_search')}
            >
              <FileVideo className="mr-2 h-4 w-4" />
              자료화면 검색
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
            {activeTab === 'search' ? '영상 검색' : activeTab === 'channel_search' ? '채널 검색' : activeTab === 'channels' ? '관심 채널' : activeTab === 'trends' ? '트렌드 & 인사이트' : activeTab === 'analyzed' ? '분석 결과' : activeTab === 'footage_search' ? '자료화면 검색' : activeTab}
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
              onChannelClick={handleChannelClick}
              // Batch Analysis Props
              isSelectionMode={isSelectionMode}
              selectedVideoIds={selectedVideoIds}
              onToggleSelectionMode={toggleSelectionMode}
              onToggleVideoSelection={toggleVideoSelection}
              onBulkSelect={handleBulkSelect}
              onBatchAnalyze={handleBatchAnalyze}
              onContextAnalyze={handleContextAnalyze}
              batchProps={{
                jobs: batchJobs,
                onClose: removeBatchJob,
                onCancel: cancelBatchJob
              }}
            />
          )}
          {activeTab === 'channel_search' && (
            <ChannelSearchSection
              savedChannelIds={savedChannels.map(c => c.channelId)}
              onToggleSave={handleToggleSave}
              onDownload={(v) => setSelectedVideoForDownload(v)}
              onAnalyze={handleAnalyze}
              onViewSubtitle={handleViewSubtitle}
              onViewComments={handleViewComments}
              onChannelClick={handleChannelClick}
              // Reuse batch props if we want batch analysis here too (User said "Batch analysis capability same as search tab")
              // However, sharing state might be tricky if switching tabs.
              // For simplicity, I'll allow batch analysis but it uses the same state as main tab.
              // This means if you select videos in main tab, switch to channel tab, selection persists. This is actually good behavior.
              isSelectionMode={isSelectionMode}
              selectedVideoIds={selectedVideoIds}
              onToggleSelectionMode={toggleSelectionMode}
              onToggleVideoSelection={toggleVideoSelection}
              onBulkSelect={handleBulkSelect}
              onBatchAnalyze={handleBatchAnalyze}
              onContextAnalyze={handleContextAnalyze}
              batchProps={{
                jobs: batchJobs,
                onClose: removeBatchJob,
                onCancel: cancelBatchJob
              }}
            />
          )}
          {activeTab === 'channels' && (
            <ChannelsSection
              channels={savedChannels}
              onRemove={(id) => handleToggleSave({ channelId: id })}
              onUpdate={handleUpdateChannel}
              onChannelClick={handleChannelClick}
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
              onChannelClick={handleChannelClick}
            />
          )}
          {activeTab === 'analyzed' && (
            <AnalyzedVideosSection
              onAnalyze={handleAnalyze}
              onViewExistingAnalysis={handleViewExistingAnalysis}
              onDownload={(v) => setSelectedVideoForDownload(v)}
              onViewSubtitle={handleViewSubtitle}
              onViewComments={handleViewComments}
              onChannelClick={handleChannelClick}
              savedChannelIds={savedChannels.map(c => c.channelId)}
              onToggleSave={handleToggleSave}
            />
          )}
          {activeTab === 'downloads' && (
            <DownloadsSection
              onDownloadStart={handleDownloadStart}
              activeDownloads={activeDownloads}
            />
          )}
          {activeTab === 'footage_search' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">자막 입력</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        자료화면을 찾고 싶은 자막을 입력하세요. 각 줄마다 적합한 이미지/영상을 추천해드립니다.
                      </p>
                      <textarea
                        className="w-full min-h-[300px] p-4 border rounded-lg resize-y font-mono text-sm"
                        placeholder="자막을 입력하세요. 예:&#10;&#10;어느날 GPT가&#10;포켓몬을 '클리어'했다는&#10;소식이 올라옴&#10;그런데 경우의 수가&#10;우주의 원자&#10;개수보다 많다는&#10;바둑도 정복한 마당에"
                        value={footageSubtitleInput}
                        onChange={(e) => setFootageSubtitleInput(e.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => {
                        if (footageSubtitleInput.trim()) {
                          setIsFootageSearchOpen(true);
                        }
                      }}
                      disabled={!footageSubtitleInput.trim()}
                    >
                      <FileVideo className="mr-2 h-5 w-5" />
                      자료화면 검색
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <DownloadDialog 
        video={selectedVideoForDownload} 
        url={!isBulkMode ? downloadUrl : undefined}
        urls={isBulkMode ? bulkUrls : undefined}
        isOpen={!!selectedVideoForDownload || isUrlDownloadOpen} 
        onDownloadStart={handleDownloadStart}
        onClose={() => {
          setSelectedVideoForDownload(null);
          setIsUrlDownloadOpen(false);
          setDownloadUrl('');
          setBulkUrls([]);
          setIsBulkMode(false);
        }} 
      />

      <ChannelDetailDialog
        channelId={selectedChannelId}
        isOpen={isChannelDetailOpen}
        onClose={() => setIsChannelDetailOpen(false)}
        onLoadToSearch={handleLoadChannelToSearch}
      />

      <AnalysisDialog
        analysis={analysisResult}
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        videoTitle={selectedVideoForAnalysis?.title}
        isAnalyzing={isAnalyzing}
        isAnalyzed={isAnalyzed}
        onRefresh={handleRefreshAnalysis}
        isSaved={selectedVideoForAnalysis ? savedChannels.some(c => c.channelId === selectedVideoForAnalysis.channelId) : false}
        onToggleSave={handleToggleSave}
        channelId={selectedVideoForAnalysis?.channelId}
        channelTitle={selectedVideoForAnalysis?.channelTitle}
        channelThumbnail={selectedVideoForAnalysis?.channelThumbnail}
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

      <FootageSearchDialog
        isOpen={isFootageSearchOpen}
        onClose={() => setIsFootageSearchOpen(false)}
        videoTitle="직접 입력한 자막"
        subtitleText={footageSubtitleInput}
      />
    </div>
  );
}

interface BatchProps {
  jobs: BatchJob[];
  onClose: (jobId: string) => void;
  onCancel: (jobId: string) => void;
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
  onContextAnalyze,
  batchProps,
  onChannelClick
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
  onContextAnalyze?: (videos: EnrichedVideo[]) => void,
  batchProps?: BatchProps,
  onChannelClick?: (channelId: string) => void
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
    removeVideo,
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

  const startContextAnalysis = () => {
    if (!onContextAnalyze || !selectedVideoIds) return;
    const selectedVideos = videos.filter(v => selectedVideoIds.has(v.id));
    onContextAnalyze(selectedVideos);
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
                        variant="danger"
                        size="sm"
                        className="h-7 text-xs px-4 font-bold shadow-sm"
                        onClick={startBatchAnalysis}
                        disabled={!selectedVideoIds || selectedVideoIds.size === 0}
                      >
                        <Sparkles className="w-3 h-3 mr-1.5 fill-white" />
                        개별 분석 ({selectedVideoIds?.size || 0})
                      </Button>
                      <Button
                        variant="purple"
                        size="sm"
                        className="h-7 text-xs px-4 font-bold shadow-sm"
                        onClick={startContextAnalysis}
                        disabled={!selectedVideoIds || selectedVideoIds.size === 0}
                      >
                        <Layers className="w-3 h-3 mr-1.5" />
                        맥락 분석 ({selectedVideoIds?.size || 0})
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

      {/* Batch Process Stack - 다중 분석 작업 */}
      {batchProps && batchProps.jobs.length > 0 && (
        <BatchProcessStack
          jobs={batchProps.jobs}
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
        onRemove={removeVideo}
        selectionMode={isSelectionMode}
        selectedVideoIds={selectedVideoIds}
        onSelectVideo={onToggleVideoSelection}
        onChannelClick={onChannelClick}
      />
    </div>
  );
}

function ChannelsSection({ channels, onRemove, onUpdate, onChannelClick }: {
  channels: SavedChannel[],
  onRemove: (id: string) => void,
  onUpdate: (channel: SavedChannel) => void,
  onChannelClick: (channelId: string) => void
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Extract unique categories
  const categories = Array.from(new Set(channels.map(c => c.category).filter(Boolean))) as string[];
  
  const filteredChannels = selectedCategory === 'all' 
    ? channels 
    : selectedCategory === 'uncategorized'
      ? channels.filter(c => !c.category)
      : channels.filter(c => c.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b overflow-x-auto scrollbar-hide">
        <Button 
          variant={selectedCategory === 'all' ? 'secondary' : 'ghost'} 
          size="sm" 
          onClick={() => setSelectedCategory('all')}
          className="h-7 rounded-full text-xs px-3"
        >
          전체 <span className="ml-1 opacity-60">{channels.length}</span>
        </Button>
        <Button 
          variant={selectedCategory === 'uncategorized' ? 'secondary' : 'ghost'} 
          size="sm" 
          onClick={() => setSelectedCategory('uncategorized')}
          className="h-7 rounded-full text-xs px-3 text-slate-500"
        >
          미분류 <span className="ml-1 opacity-60">{channels.filter(c => !c.category).length}</span>
        </Button>
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className="h-7 rounded-full text-xs px-3"
          >
            {cat} <span className="ml-1 opacity-60">{channels.filter(c => c.category === cat).length}</span>
          </Button>
        ))}
      </div>

      {filteredChannels.length === 0 ? (
        <div className="text-center py-20 text-slate-500 flex flex-col items-center gap-2">
          <FolderOpen className="w-10 h-10 opacity-20" />
          <p>
            {selectedCategory === 'all' 
            ? "저장된 채널이 없습니다." 
            : "이 카테고리에 채널이 없습니다."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredChannels.map(channel => (
            <div 
              key={channel.channelId} 
              className="group relative flex items-center p-3 gap-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:shadow-md transition-all hover:border-red-200 dark:hover:border-red-900/50"
            >
              <button
                onClick={() => onChannelClick(channel.channelId)}
                className="shrink-0 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800 group-hover:ring-red-500/30 transition-all">
                  {channel.thumbnail ? (
                    <img src={channel.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Youtube className="w-full h-full p-2 text-slate-400" />
                  )}
                </div>
              </button>

              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <button
                  onClick={() => onChannelClick(channel.channelId)}
                  className="font-medium text-sm truncate hover:text-red-600 dark:hover:text-red-400 transition-colors block leading-tight mb-1 text-left"
                >
                  {channel.channelTitle}
                </button>
                
                {/* Category Selector - Compact */}
                <div className="flex items-center">
                   <CategorySelector 
                     currentCategory={channel.category} 
                     allCategories={categories}
                     onSelect={(cat) => onUpdate({ ...channel, category: cat })}
                   />
                </div>
              </div>

              {/* Delete Button - Absolute Top Right */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(channel.channelId);
                }}
                className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                title="채널 삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper Component for Category Selection
function CategorySelector({ currentCategory, allCategories, onSelect }: { currentCategory?: string, allCategories: string[], onSelect: (cat: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newCat, setNewCat] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (newCat.trim()) {
      onSelect(newCat.trim());
      setNewCat('');
      setIsAdding(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "text-[11px] px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors border",
          currentCategory
            ? "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
            : "text-muted-foreground hover:text-foreground hover:bg-muted border-dashed border-border"
        )}
      >
        <Tag className="w-3 h-3" />
        {currentCategory || '분류 추가'}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setIsAdding(false); }} />
          <div
            className="absolute top-full left-0 mt-2 bg-card border border-border shadow-xl rounded-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={{ width: '280px' }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">카테고리 설정</span>
                <Tag className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* Category List */}
            <div className="p-2">
              <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
                {allCategories.length === 0 && !isAdding && (
                  <div className="text-sm text-muted-foreground px-3 py-6 text-center border border-dashed border-border rounded-lg">
                    생성된 카테고리가 없습니다
                  </div>
                )}
                {allCategories.map(cat => (
                  <button
                    key={cat}
                    className={cn(
                      "w-full text-sm text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors",
                      currentCategory === cat
                        ? "bg-danger/10 text-danger font-medium"
                        : "text-foreground hover:bg-muted"
                    )}
                    onClick={() => { onSelect(cat); setIsOpen(false); }}
                  >
                    <span className="truncate">{cat}</span>
                    {currentCategory === cat && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                ))}
              </div>

              {currentCategory && (
                <button
                  className="w-full text-sm text-left px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground flex items-center gap-2 mt-1"
                  onClick={() => { onSelect(''); setIsOpen(false); }}
                >
                  <X className="w-4 h-4" />
                  분류 해제
                </button>
              )}
            </div>

            {/* Add New Category */}
            <div className="p-2 pt-0 border-t border-border mt-1">
              {isAdding ? (
                <div className="flex items-center gap-2 p-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={inputRef}
                    value={newCat}
                    onChange={e => setNewCat(e.target.value)}
                    className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="새 분류명 입력..."
                    onKeyDown={e => e.key === 'Enter' && handleAdd(e)}
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAdd}
                    variant="default"
                    className="shrink-0"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <button
                  className="w-full text-sm text-left px-3 py-2.5 rounded-lg hover:bg-muted flex items-center gap-2 text-danger font-medium transition-colors mt-2"
                  onClick={(e) => { e.stopPropagation(); setIsAdding(true); }}
                >
                  <Plus className="w-4 h-4" /> 새 카테고리 추가
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TrendsSection({ savedChannelIds, onToggleSave, onDownload, onAnalyze, onViewSubtitle, onViewComments, onChannelClick }: {
  savedChannelIds: string[],
  onToggleSave: (c: any) => void,
  onDownload: (v: any) => void,
  onAnalyze: (v: EnrichedVideo) => void,
  onViewSubtitle: (v: EnrichedVideo) => void,
  onViewComments: (v: EnrichedVideo) => void,
  onChannelClick?: (channelId: string) => void
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
        onChannelClick={onChannelClick}
      />
    </div>
  );
}
function AnalyzedVideosSection({
  onAnalyze,
  onViewExistingAnalysis,
  onDownload,
  onViewSubtitle,
  onViewComments,
  onChannelClick,
  savedChannelIds,
  onToggleSave
}: {
  onAnalyze: (v: EnrichedVideo) => void,
  onViewExistingAnalysis: (v: EnrichedVideo, analysis: any) => void,
  onDownload: (v: any) => void,
  onViewSubtitle: (v: EnrichedVideo) => void,
  onViewComments: (v: EnrichedVideo) => void,
  onChannelClick?: (channelId: string) => void,
  savedChannelIds: string[],
  onToggleSave: (c: any) => void
}) {
  const [analyzedVideos, setAnalyzedVideos] = useState<AnalyzedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all'); // 'all', 'single', 'context'

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

  // Derived State
  const uniqueChannels = Array.from(new Set(analyzedVideos.map(v => v.channelId).filter(Boolean))).map(id => {
    const video = analyzedVideos.find(v => v.channelId === id);
    return { id, title: video?.channelTitle || 'Unknown Channel' };
  }).sort((a, b) => a.title.localeCompare(b.title));

  const filteredVideos = analyzedVideos.filter(v => {
    if (selectedChannelFilter !== 'all' && v.channelId !== selectedChannelFilter) return false;
    if (selectedTypeFilter === 'single' && v.type === 'context') return false;
    if (selectedTypeFilter === 'context' && v.type !== 'context') return false;
    return true;
  });

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

  const handleExportPDF = () => {
    if (filteredVideos.length === 0) return;

    // Generate HTML content for print
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>TubeSource AI Analysis Report</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .video-report { page-break-inside: avoid; }
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
            padding: 40px;
            color: #1e293b;
            line-height: 1.6;
            background: white;
          }
          .header {
            border-bottom: 3px solid #ef4444;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 { color: #ef4444; font-size: 24px; margin-bottom: 8px; }
          .header p { color: #64748b; font-size: 13px; }
          .video-report {
            margin-bottom: 40px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 24px;
            background: #fff;
          }
          .video-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 12px;
            color: #0f172a;
            line-height: 1.4;
          }
          .video-meta {
            display: flex;
            gap: 24px;
            margin-bottom: 20px;
            padding: 12px 16px;
            background: #f8fafc;
            border-radius: 6px;
            font-size: 12px;
          }
          .meta-item b { display: block; color: #64748b; margin-bottom: 2px; font-size: 10px; text-transform: uppercase; }
          .section { margin-bottom: 16px; }
          .section-title {
            font-size: 13px;
            font-weight: bold;
            color: #ef4444;
            margin-bottom: 6px;
          }
          .section-content {
            font-size: 12px;
            white-space: pre-wrap;
            line-height: 1.7;
          }
          .list-section { display: flex; gap: 24px; margin-top: 16px; }
          .list-column { flex: 1; }
          .list-item { font-size: 12px; margin-bottom: 6px; padding-left: 14px; position: relative; line-height: 1.5; }
          .list-item::before { content: "•"; position: absolute; left: 0; color: #ef4444; font-weight: bold; }
          .keywords { margin-top: 16px; }
          .tag {
            display: inline-block;
            background: #f1f5f9;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 11px;
            margin-right: 6px;
            margin-bottom: 6px;
          }
          .print-guide {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
            font-size: 13px;
          }
          .print-guide strong { color: #d97706; }
          @media print { .print-guide { display: none; } }
        </style>
      </head>
      <body>
        <div class="print-guide">
          <strong>PDF로 저장하기:</strong> Ctrl+P (Windows) 또는 Cmd+P (Mac)를 눌러 인쇄 대화상자를 열고, "PDF로 저장"을 선택하세요.
        </div>

        <div class="header">
          <h1>TubeSource AI Analysis Report</h1>
          <p>총 ${filteredVideos.length}개 리포트 | ${new Date().toLocaleString()}</p>
        </div>

        ${filteredVideos.map(v => {
          const result = v.analysisResult as any;
          const isContext = v.type === 'context';
          const videoUrl = !isContext && v.videoId ? `https://www.youtube.com/watch?v=${v.videoId}` : '';

          // 텍스트 필드
          const hook = result.hook || result.commonalities || '';
          const structure = result.structure || result.strategies || '';
          const target = result.target || '';
          const communityNeeds = result.community_needs || '';
          const actionPlan = result.action_plan || '';

          // 배열 필드
          const strengths: string[] = Array.isArray(result.strengths) ? result.strengths : (result.strengths ? [result.strengths] : []);
          const weaknesses: string[] = Array.isArray(result.weaknesses) ? result.weaknesses : (result.weaknesses ? [result.weaknesses] : []);
          const insights: string[] = Array.isArray(result.insights) ? result.insights : (result.insights ? [result.insights] : []);
          const keywords: string[] = Array.isArray(result.search_keywords) ? result.search_keywords : [];
          const editingTips: string[] = Array.isArray(result.editing_tips) ? result.editing_tips : (result.editing_tips ? [result.editing_tips] : []);

          // 자막 (줄바꿈을 공백으로 치환하여 한 줄로 표시)
          const transcript = (v.transcript || '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

          return `
            <div class="video-report">
              <div class="video-title">${v.title || 'Untitled'}</div>
              ${videoUrl ? `<div style="margin-bottom: 12px;"><a href="${videoUrl}" target="_blank" style="color: #ef4444; font-size: 12px; text-decoration: none;">▶ ${videoUrl}</a></div>` : ''}
              <div class="video-meta">
                <div class="meta-item"><b>채널</b>${v.channelTitle || '-'}</div>
                <div class="meta-item"><b>조회수</b>${(v.viewCount || 0).toLocaleString()}회</div>
                <div class="meta-item"><b>성과도</b>${v.performanceRatio || 0}%</div>
                <div class="meta-item"><b>분석일</b>${v.analyzedAt ? new Date(v.analyzedAt).toLocaleDateString() : '-'}</div>
              </div>

              ${hook ? `
              <div class="section">
                <div class="section-title">${isContext ? '공통 특성' : '핵심 후킹 포인트'}</div>
                <div class="section-content">${hook}</div>
              </div>
              ` : ''}

              ${structure ? `
              <div class="section">
                <div class="section-title">${isContext ? '공통 전략' : '콘텐츠 구성 및 전략'}</div>
                <div class="section-content">${structure}</div>
              </div>
              ` : ''}

              ${target ? `
              <div class="section">
                <div class="section-title">타겟 오디언스</div>
                <div class="section-content">${target}</div>
              </div>
              ` : ''}

              ${communityNeeds ? `
              <div class="section">
                <div class="section-title">커뮤니티 니즈 분석</div>
                <div class="section-content">${communityNeeds}</div>
              </div>
              ` : ''}

              ${actionPlan ? `
              <div class="section">
                <div class="section-title">실행 계획</div>
                <div class="section-content">${actionPlan}</div>
              </div>
              ` : ''}

              <div class="list-section">
                <div class="list-column">
                  <div class="section-title">강점 분석</div>
                  ${strengths.length > 0
                    ? strengths.map(s => `<div class="list-item">${s}</div>`).join('')
                    : '<div class="section-content">-</div>'}
                </div>
                <div class="list-column">
                  <div class="section-title">약점 및 개선점</div>
                  ${weaknesses.length > 0
                    ? weaknesses.map(w => `<div class="list-item">${w}</div>`).join('')
                    : '<div class="section-content">-</div>'}
                </div>
              </div>

              <div class="list-section">
                <div class="list-column">
                  <div class="section-title">핵심 인사이트</div>
                  ${insights.length > 0
                    ? insights.map(i => `<div class="list-item">${i}</div>`).join('')
                    : '<div class="section-content">-</div>'}
                </div>
                <div class="list-column">
                  <div class="section-title">편집 방식 추천</div>
                  ${editingTips.length > 0
                    ? editingTips.map(t => `<div class="list-item">${t}</div>`).join('')
                    : '<div class="section-content">-</div>'}
                </div>
              </div>

              <div class="keywords">
                <div class="section-title">유사 소스 키워드</div>
                <div>
                  ${keywords.length > 0
                    ? keywords.map(k => `<span class="tag">#${k}</span>`).join('')
                    : '<span class="section-content">-</span>'}
                </div>
              </div>

              ${transcript ? `
              <div class="section" style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                <div class="section-title">자막</div>
                <div style="max-height: 150px; overflow-y: auto; background: #f8fafc; padding: 12px; border-radius: 6px; font-size: 11px; line-height: 1.6; color: #475569;">${transcript}</div>
              </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </body>
      </html>
    `;

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
      alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          총 {analyzedVideos.length}개의 분석된 영상
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
          disabled={filteredVideos.length === 0}
          className="gap-2 h-8 text-xs border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20 text-red-600 disabled:opacity-50"
        >
          <FileText className="w-3.5 h-3.5" />
          PDF 리포트 내보내기
        </Button>
      </div>

      {analyzedVideos.length > 0 && (
        <Card className="bg-slate-50/50 dark:bg-slate-900/50 border-dashed mb-4">
          <CardContent className="p-3 flex flex-wrap gap-4 items-center">
            {/* Type Filter */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <Button 
                variant={selectedTypeFilter === 'all' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-7 text-xs" 
                onClick={() => setSelectedTypeFilter('all')}
              >
                전체
              </Button>
              <Button 
                variant={selectedTypeFilter === 'single' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-7 text-xs" 
                onClick={() => setSelectedTypeFilter('single')}
              >
                영상 분석
              </Button>
              <Button 
                variant={selectedTypeFilter === 'context' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-7 text-xs" 
                onClick={() => setSelectedTypeFilter('context')}
              >
                맥락 분석
              </Button>
            </div>

            {/* Channel Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">채널:</span>
              <Select value={selectedChannelFilter} onValueChange={setSelectedChannelFilter}>
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue placeholder="모든 채널" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 채널</SelectItem>
                  {uniqueChannels.map(ch => (
                    <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="ml-auto text-xs text-slate-400">
              {filteredVideos.length}개 표시 중
            </div>
          </CardContent>
        </Card>
      )}

      {filteredVideos.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          {analyzedVideos.length > 0 ? "조건에 맞는 분석 결과가 없습니다." : "아직 분석된 영상이 없습니다"}
        </div>
      ) : (
        <VideoList
          videos={filteredVideos.map(v => ({
            id: v.videoId,
            title: v.title,
            channelTitle: v.channelTitle,
            channelId: v.channelId,
            channelThumbnail: '',
            thumbnail: v.thumbnail,
            viewCount: v.viewCount,
            likeCount: v.likeCount,
            commentCount: v.commentCount || 0,
            subscriberCount: v.subscriberCount,
            engagementRate: v.engagementRate,
            performanceRatio: v.performanceRatio,
            publishedAt: v.analyzedAt,
            description: '',
            duration: v.duration || '',
            caption: v.caption ?? false,
            creativeCommons: v.creativeCommons ?? false,
            subtitleText: v.transcript || '',
            channelVideoCount: 0,
            channelViewCount: 0,
          }))}
          loading={loading}
          savedChannelIds={savedChannelIds}
          onToggleSave={onToggleSave}
          onDownload={onDownload}
          onAnalyze={handleViewAnalysis}
          onViewSubtitle={onViewSubtitle}
          onViewComments={onViewComments}
          onDeleteAnalysis={handleDeleteAnalysis}
          onChannelClick={onChannelClick}
        />
      )}
    </div>
  );
}

function ChannelSearchSection({
  savedChannelIds,
  onToggleSave,
  onDownload,
  onAnalyze,
  onViewSubtitle,
  onViewComments,
  onChannelClick,
  isSelectionMode,
  selectedVideoIds,
  onToggleSelectionMode,
  onToggleVideoSelection,
  onBulkSelect,
  onBatchAnalyze,
  onContextAnalyze,
  batchProps
}: {
  savedChannelIds: string[],
  onToggleSave: (c: any) => void,
  onDownload: (v: any) => void,
  onAnalyze: (v: EnrichedVideo) => void,
  onViewSubtitle: (v: EnrichedVideo) => void,
  onViewComments: (v: EnrichedVideo) => void,
  onChannelClick?: (channelId: string) => void,
  isSelectionMode?: boolean,
  selectedVideoIds?: Set<string>,
  onToggleSelectionMode?: () => void,
  onToggleVideoSelection?: (id: string) => void,
  onBulkSelect?: (ids: string[], select: boolean) => void,
  onBatchAnalyze?: (videos: EnrichedVideo[]) => void,
  onContextAnalyze?: (videos: EnrichedVideo[]) => void,
  batchProps?: BatchProps
}) {
  const {
    channelQuery, setChannelQuery,
    foundChannels, setFoundChannels,
    isSearchingChannels, setIsSearchingChannels,
    selectedChannel, setSelectedChannel,
    videoQuery, setVideoQuery,
    filters, setFilters,
    videos, setVideos,
    allVideos, setAllVideos,
    sortBy, setSortBy,
    timePeriod, setTimePeriod,
    loading, setLoading,
    hasSearched, setHasSearched,
    isHydrated,
    applySorting,
  } = useChannelSearch();

  // Track previous selectedChannel to detect actual changes
  const prevSelectedChannelRef = useRef<string | null>(null);
  const isInitialMount = useRef(true);

  // Auto-search videos when channel is selected (only on actual changes, not on hydration restore)
  useEffect(() => {
    if (!isHydrated) return;

    const currentChannelId = selectedChannel?.id || null;
    const prevChannelId = prevSelectedChannelRef.current;

    // On initial mount with restored state, don't re-fetch if we already have videos
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevSelectedChannelRef.current = currentChannelId;
      // If we have videos from restored state, don't fetch
      if (allVideos.length > 0) return;
    }

    // Only fetch if channel actually changed
    if (currentChannelId !== prevChannelId) {
      prevSelectedChannelRef.current = currentChannelId;
      if (selectedChannel) {
        handleVideoSearch();
      }
    }
  }, [selectedChannel, isHydrated]);

  const handleChannelSearch = async () => {
    if (!channelQuery.trim()) return;
    setIsSearchingChannels(true);
    try {
      const res = await fetch(`/api/channels/search?q=${encodeURIComponent(channelQuery)}`);
      const data = await res.json();
      setFoundChannels(data.channels || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingChannels(false);
    }
  };

  const handleVideoSearch = async () => {
    if (!selectedChannel) return;
    setLoading(true);

    try {
      const searchFilters = {
        q: videoQuery,
        channelId: selectedChannel.id,
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
      } else {
        setAllVideos([]);
        setVideos([]);
      }
    } catch (e) {
      console.error(e);
      setAllVideos([]);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const getPublishedAfter = (period: string): string | undefined => {
    if (period === 'all') return undefined;
    const now = new Date();
    const periods: Record<string, number> = {
      '1d': 1, '1w': 7, '1m': 30, '3m': 90, '6m': 180, '1y': 365,
    };
    const daysAgo = periods[period];
    if (!daysAgo) return undefined;
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return date.toISOString();
  };

  useEffect(() => {
    if (allVideos.length > 0) {
      applySorting(allVideos, sortBy);
    }
  }, [sortBy]);

  // Batch Helpers
  const handleSelectAll = () => {
    if (!onBulkSelect || !selectedVideoIds) return;
    const allSelected = videos.every(v => selectedVideoIds.has(v.id));
    const allIds = videos.map(v => v.id);
    if (allSelected) onBulkSelect(allIds, false);
    else onBulkSelect(allIds, true);
  };

  return (
    <div className="space-y-6">
      {/* Channel Search / Selector */}
      <Card className="border-red-100 dark:border-red-900/30">
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="채널 이름으로 검색..."
                className="pl-10 h-10"
                value={channelQuery}
                onChange={(e) => setChannelQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChannelSearch()}
              />
            </div>
            <Button onClick={handleChannelSearch} disabled={isSearchingChannels} variant="outline" className="h-10">
              {isSearchingChannels ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">채널 찾기</span>
            </Button>
          </div>

          {foundChannels.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
              {foundChannels.map(channel => (
                <button
                  key={channel.channelId}
                  onClick={() => {
                    setSelectedChannel({ 
                      id: channel.channelId, 
                      title: channel.channelTitle, 
                      thumbnail: channel.thumbnail 
                    });
                    setFoundChannels([]);
                    setChannelQuery('');
                  }}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border transition-all text-left group",
                    selectedChannel?.id === channel.channelId 
                      ? "border-red-500 bg-red-50 dark:bg-red-950/20" 
                      : "border-slate-200 hover:border-red-300 dark:border-slate-800"
                  )}
                >
                  <img src={channel.thumbnail} alt="" className="w-8 h-8 rounded-full" />
                  <span className="text-xs font-medium truncate flex-1">{channel.channelTitle}</span>
                </button>
              ))}
            </div>
          )}

          {selectedChannel && (
            <div className="flex items-center justify-between p-3 bg-red-50/50 dark:bg-red-950/10 rounded-lg border border-red-100 dark:border-red-900/20">
              <div className="flex items-center gap-3">
                {selectedChannel.thumbnail && (
                  <img src={selectedChannel.thumbnail} alt="" className="w-10 h-10 rounded-full border border-white shadow-sm" />
                )}
                <div className="flex flex-col">
                  <span className="font-bold text-sm">{selectedChannel.title}</span>
                  <span className="text-[10px] text-slate-400">ID: {selectedChannel.id}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedChannel(null)} className="h-7 text-xs text-slate-500">
                변경
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedChannel && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="채널 내 영상 검색 (비워두면 전체)..."
                    className="pl-10 h-10"
                    value={videoQuery}
                    onChange={(e) => setVideoQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVideoSearch()}
                  />
                </div>
                <Button onClick={handleVideoSearch} disabled={loading} variant="danger" size="lg">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span className="ml-2">영상 검색</span>
                </Button>
              </div>

              <div className="flex flex-wrap items-end gap-3 sm:gap-4 border-t pt-4">
                <div className="flex flex-col gap-1 min-w-[100px] flex-1 sm:flex-none">
                  <Label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider ml-0.5">정렬</Label>
                  <Select value={filters.order} onValueChange={(v) => setFilters({...filters, order: v as any})}>
                    <SelectTrigger className="h-8 w-full sm:w-[110px]">
                      <SelectValue placeholder="정렬" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">최신순</SelectItem>
                      <SelectItem value="viewCount">조회수순</SelectItem>
                      <SelectItem value="rating">평점순</SelectItem>
                      <SelectItem value="relevance">관련성순</SelectItem>
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
                      <SelectItem value="50">50개</SelectItem>
                      <SelectItem value="100">100개</SelectItem>
                      <SelectItem value="0">전체 (All)</SelectItem>
                    </SelectContent>
                  </Select>
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

                <div className="flex items-center gap-3 h-8 ml-auto pr-1">
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-3 h-3 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      checked={filters.fetchSubtitles !== false}
                      onChange={(e) => setFilters({...filters, fetchSubtitles: e.target.checked})}
                    />
                    자막 포함
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {videos.length > 0 && (
            <Card className="bg-slate-50/50 dark:bg-slate-900/50 border-dashed">
              <CardContent className="py-1.5 px-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2 ml-1 shrink-0">심화 정렬</span>
                    <Button variant={sortBy === 'none' ? 'default' : 'ghost'} size="sm" className="h-6 text-[11px] px-2" onClick={() => setSortBy('none')}>기본</Button>
                    <Button variant={sortBy === 'newest' ? 'default' : 'ghost'} size="sm" className="h-6 text-[11px] px-2" onClick={() => setSortBy('newest')}>최신순</Button>
                    <Button variant={sortBy === 'oldest' ? 'default' : 'ghost'} size="sm" className="h-6 text-[11px] px-2" onClick={() => setSortBy('oldest')}>오래된순</Button>
                    <Button variant={sortBy === 'views' ? 'default' : 'ghost'} size="sm" className="h-6 text-[11px] px-2" onClick={() => setSortBy('views')}>조회수</Button>
                    <Button variant={sortBy === 'performance' ? 'default' : 'ghost'} size="sm" className="h-6 text-[11px] px-2" onClick={() => setSortBy('performance')}>성과도</Button>
                    <Button variant={sortBy === 'engagement' ? 'default' : 'ghost'} size="sm" className="h-6 text-[11px] px-2" onClick={() => setSortBy('engagement')}>참여율</Button>
                    <Button variant={sortBy === 'likes' ? 'default' : 'ghost'} size="sm" className="h-6 text-[11px] px-2" onClick={() => setSortBy('likes')}>좋아요</Button>
                    <Button variant={sortBy === 'comments' ? 'default' : 'ghost'} size="sm" className="h-6 text-[11px] px-2" onClick={() => setSortBy('comments')}>댓글</Button>
                  </div>

                  {onToggleSelectionMode && (
                    <div className="ml-auto flex items-center gap-2">
                      <div className="text-[10px] text-slate-400 font-medium pr-1 shrink-0 hidden sm:block">총 {videos.length}개</div>
                      {isSelectionMode ? (
                        <div className="flex items-center gap-1.5">
                          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={onToggleSelectionMode}>취소</Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs px-3" onClick={handleSelectAll}>
                            {selectedVideoIds?.size === videos.length ? '전체 해제' : '전체 선택'}
                          </Button>
                          <Button variant="danger" size="sm" className="h-7 text-xs px-4" onClick={() => onBatchAnalyze?.(videos.filter(v => selectedVideoIds?.has(v.id)))} disabled={!selectedVideoIds?.size}>
                            개별 분석 ({selectedVideoIds?.size || 0})
                          </Button>
                          <Button variant="purple" size="sm" className="h-7 text-xs px-4" onClick={() => onContextAnalyze?.(videos.filter(v => selectedVideoIds?.has(v.id)))} disabled={!selectedVideoIds?.size}>
                            맥락 분석 ({selectedVideoIds?.size || 0})
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="h-7 text-xs px-3" onClick={onToggleSelectionMode}>
                          일괄 AI 분석
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Batch Process Stack - 다중 분석 작업 */}
          {batchProps && batchProps.jobs.length > 0 && (
            <BatchProcessStack
              jobs={batchProps.jobs}
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
            onChannelClick={onChannelClick}
            selectionMode={isSelectionMode}
            selectedVideoIds={selectedVideoIds}
            onSelectVideo={onToggleVideoSelection}
                    />
                  </div>
                )}
              </div>
            );
          }
          
function DownloadsSection({ onDownloadStart, activeDownloads }: {
  onDownloadStart: (info: any) => void,
  activeDownloads: any[]
}) {
  const [inputText, setInputText] = useState('');

  const extractUrls = (text: string) => {
    // YouTube and TikTok Regex
    const urlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]{11}|https?:\/\/(?:www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+)(?:[^\s]*)/g;
    const matches = text.match(urlRegex);
    return matches ? Array.from(new Set(matches)) : [];
  };

  const extractedUrls = extractUrls(inputText);

  const extractVideoId = (url: string): string => {
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return ytMatch[1];

    // TikTok
    if (url.includes('tiktok.com')) {
      const tiktokMatch = url.match(/\/video\/(\d+)/);
      if (tiktokMatch) return tiktokMatch[1];
      return 'TikTok';
    }

    return 'Video';
  };

  const handleDownload = (format: 'mp4' | 'mp3') => {
    if (extractedUrls.length === 0) return;

    const infos = extractedUrls.map(url => ({
      id: url,
      title: `로딩 중... (${extractVideoId(url)})`,
      format,
      url
    }));

    onDownloadStart(infos);
    setInputText('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Download className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="유튜브 또는 틱톡 링크를 붙여넣으세요..."
                className="pl-10 h-10"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>
            <Button
              onClick={() => handleDownload('mp4')}
              disabled={extractedUrls.length === 0}
              variant="danger"
              size="lg"
            >
              <FileVideo className="h-4 w-4" />
              <span>MP4</span>
            </Button>
            <Button
              onClick={() => handleDownload('mp3')}
              disabled={extractedUrls.length === 0}
              variant="info"
              size="lg"
            >
              <Music className="h-4 w-4" />
              <span>MP3</span>
            </Button>
          </div>

          {extractedUrls.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500 border-t pt-3">
              <Badge variant="secondary" className="text-[10px]">{extractedUrls.length}개</Badge>
              <span>링크 감지됨</span>
            </div>
          )}
        </CardContent>
      </Card>

      {activeDownloads.length > 0 && (
        <Card className="bg-slate-50/50 dark:bg-slate-900/50 border-dashed">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <List className="w-3 h-3" />
                다운로드 현황
              </h3>
              <span className="text-[10px] text-slate-400">
                {activeDownloads.filter(d => d.status === 'completed').length}/{activeDownloads.length} 완료
              </span>
            </div>
            <div className="space-y-2">
              {activeDownloads.map((download) => (
                <div key={download.uniqueId} className="flex items-center gap-3 p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <div className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
                    download.format === 'mp4' ? "bg-red-50 text-red-500 dark:bg-red-950/30" : "bg-blue-50 text-blue-500 dark:bg-blue-950/30"
                  )}>
                    {download.format === 'mp4' ? <FileVideo className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-2 mb-1">
                      <p className="text-xs font-medium truncate">{download.title}</p>
                      <Badge variant={
                        download.status === 'completed' ? 'secondary' :
                        download.status === 'error' ? 'destructive' : 'outline'
                      } className="text-[10px] h-5 px-2 shrink-0">
                        {download.status === 'completed' ? '완료' :
                         download.status === 'error' ? '에러' :
                         download.status === 'downloading' ? `${Math.round(download.progress)}%` : '준비 중'}
                      </Badge>
                    </div>
                    <Progress value={download.progress} className="h-1" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
          