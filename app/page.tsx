'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Youtube, Download, BarChart2, List, Settings, Loader2, Trash2, ExternalLink, TrendingUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VideoList } from '@/components/video-list';
import { DownloadDialog } from '@/components/download-dialog';
import { AnalysisDialog } from '@/components/analysis-dialog';
import { EnrichedVideo, VideoSearchFilters } from '@/lib/youtube';
import { SavedChannel } from '@/lib/storage';

export default function Home() {
  const [activeTab, setActiveTab] = useState('search');
  const [savedChannels, setSavedChannels] = useState<SavedChannel[]>([]);
  const [selectedVideoForDownload, setSelectedVideoForDownload] = useState<{ id: string; title: string } | null>(null);

  const [selectedVideoForAnalysis, setSelectedVideoForAnalysis] = useState<EnrichedVideo | null>(null);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

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

  const handleAnalyze = async (video: EnrichedVideo) => {
    setSelectedVideoForAnalysis(video);
    setIsAnalysisOpen(true);
    setAnalysisResult(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(video),
      });
      const data = await res.json();
      setAnalysisResult(data.analysis);
    } catch (e) {
      console.error(e);
      setAnalysisResult({ error: "분석 중 오류가 발생했습니다." });
    }
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
            {activeTab === 'search' ? '영상 검색' : activeTab === 'channels' ? '관심 채널' : activeTab === 'trends' ? '트렌드 & 인사이트' : activeTab}
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
      />
    </div>
  );
}

function SearchSection({ savedChannelIds, onToggleSave, onDownload, onAnalyze }: {
  savedChannelIds: string[],
  onToggleSave: (c: any) => void,
  onDownload: (v: any) => void,
  onAnalyze: (v: EnrichedVideo) => void
}) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Partial<VideoSearchFilters>>({
    videoDuration: 'any',
    order: 'relevance',
    maxResults: 100,
    regionCode: 'KR',
  });
  const [timePeriod, setTimePeriod] = useState<string>('all'); // all, 1d, 1w, 1m, 3m, 6m, 1y
  const [sortBy, setSortBy] = useState<string>('none'); // none, views, subscribers, performance, engagement, likes, comments
  const [videos, setVideos] = useState<EnrichedVideo[]>([]);
  const [allVideos, setAllVideos] = useState<EnrichedVideo[]>([]); // For client-side sorting
  const [loading, setLoading] = useState(false);

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
    setVideos([]);
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
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // Apply client-side sorting
  const applySorting = (videoList: EnrichedVideo[], sortType: string) => {
    let sorted = [...videoList];

    switch (sortType) {
      case 'views':
        sorted.sort((a, b) => b.viewCount - a.viewCount);
        break;
      case 'subscribers':
        sorted.sort((a, b) => b.subscriberCount - a.subscriberCount);
        break;
      case 'performance':
        sorted.sort((a, b) => b.performanceRatio - a.performanceRatio);
        break;
      case 'engagement':
        sorted.sort((a, b) => b.engagementRate - a.engagementRate);
        break;
      case 'likes':
        sorted.sort((a, b) => b.likeCount - a.likeCount);
        break;
      case 'comments':
        sorted.sort((a, b) => b.commentCount - a.commentCount);
        break;
      case 'none':
      default:
        // No sorting - keep original order
        break;
    }

    setVideos(sorted);
  };

  // Re-apply sorting when sort option changes
  useEffect(() => {
    if (allVideos.length > 0) {
      applySorting(allVideos, sortBy);
    }
  }, [sortBy]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>검색 필터</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* 검색어 */}
          <div>
            <label className="text-sm font-medium mb-2 block">검색어</label>
            <Input
              placeholder="검색어 입력..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          {/* 기본 필터 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">국가</label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 dark:border-slate-800 dark:bg-slate-950"
                value={filters.regionCode}
                onChange={(e) => setFilters({...filters, regionCode: e.target.value})}
              >
                <option value="">전체 국가</option>
                <option value="KR">🇰🇷 한국</option>
                <option value="US">🇺🇸 미국</option>
                <option value="JP">🇯🇵 일본</option>
                <option value="GB">🇬🇧 영국</option>
                <option value="IN">🇮🇳 인도</option>
                <option value="CN">🇨🇳 중국</option>
                <option value="FR">🇫🇷 프랑스</option>
                <option value="DE">🇩🇪 독일</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">영상 길이</label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 dark:border-slate-800 dark:bg-slate-950"
                value={filters.videoDuration}
                onChange={(e) => setFilters({...filters, videoDuration: e.target.value as any})}
              >
                <option value="any">모든 길이</option>
                <option value="short">쇼츠 (&lt; 4분)</option>
                <option value="medium">미디엄 (4-20분)</option>
                <option value="long">롱폼 (&gt; 20분)</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">업로드 기간</label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 dark:border-slate-800 dark:bg-slate-950"
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
              >
                <option value="all">모든 기간</option>
                <option value="1d">1일 이내</option>
                <option value="1w">1주일 이내</option>
                <option value="1m">1개월 이내</option>
                <option value="3m">3개월 이내</option>
                <option value="6m">6개월 이내</option>
                <option value="1y">1년 이내</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">수집 개수</label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 dark:border-slate-800 dark:bg-slate-950"
                value={filters.maxResults}
                onChange={(e) => setFilters({...filters, maxResults: Number(e.target.value)})}
              >
                <option value="10">10개</option>
                <option value="20">20개</option>
                <option value="30">30개</option>
                <option value="50">50개</option>
                <option value="100">100개</option>
              </select>
            </div>
          </div>

          {/* YouTube API 정렬 및 옵션 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">YouTube API 정렬</label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 dark:border-slate-800 dark:bg-slate-950"
                value={filters.order}
                onChange={(e) => setFilters({...filters, order: e.target.value as any})}
              >
                <option value="relevance">관련성순</option>
                <option value="date">최신순</option>
                <option value="viewCount">조회수순</option>
                <option value="rating">평점순</option>
                <option value="title">제목순</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer h-10">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={filters.creativeCommons || false}
                  onChange={(e) => setFilters({...filters, creativeCommons: e.target.checked})}
                />
                크리에이티브 커먼즈
              </label>
            </div>
          </div>

          {/* 검색 버튼 및 결과 */}
          <div className="flex justify-between items-center pt-2">
            <div className="text-sm text-slate-500">
              {videos.length > 0 && (
                <span>
                  총 {videos.length}개 영상
                </span>
              )}
            </div>
            <Button onClick={handleSearch} disabled={loading} size="lg">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Search className="mr-2 h-4 w-4" />
              영상 검색
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 결과 정렬 버튼 */}
      {allVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">결과 정렬</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={sortBy === 'none' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('none')}
              >
                정렬 안함
              </Button>
              <Button
                variant={sortBy === 'views' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('views')}
              >
                조회수 높은순
              </Button>
              <Button
                variant={sortBy === 'subscribers' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('subscribers')}
              >
                구독자수 높은순
              </Button>
              <Button
                variant={sortBy === 'performance' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('performance')}
              >
                성과도 높은순
              </Button>
              <Button
                variant={sortBy === 'engagement' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('engagement')}
              >
                참여율 높은순
              </Button>
              <Button
                variant={sortBy === 'likes' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('likes')}
              >
                좋아요 많은순
              </Button>
              <Button
                variant={sortBy === 'comments' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('comments')}
              >
                댓글 많은순
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <VideoList
        videos={videos}
        loading={loading}
        savedChannelIds={savedChannelIds}
        onToggleSave={onToggleSave}
        onDownload={onDownload}
        onAnalyze={onAnalyze}
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

function TrendsSection({ savedChannelIds, onToggleSave, onDownload, onAnalyze }: { 
  savedChannelIds: string[], 
  onToggleSave: (c: any) => void,
  onDownload: (v: any) => void,
  onAnalyze: (v: EnrichedVideo) => void
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
      />
    </div>
  );
}