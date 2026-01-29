"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { EnrichedVideo, VideoSearchFilters } from '@/lib/youtube';

const STORAGE_KEY = 'tubesource-channel-search-state';

export interface SelectedChannel {
  id: string;
  title: string;
  thumbnail?: string;
}

export interface FoundChannel {
  channelId: string;
  channelTitle: string;
  thumbnail: string;
}

interface PersistedState {
  channelQuery: string;
  foundChannels: FoundChannel[];
  selectedChannel: SelectedChannel | null;
  videoQuery: string;
  filters: Partial<VideoSearchFilters>;
  allVideos: EnrichedVideo[];
  sortBy: string;
  timePeriod: string;
  hasSearched: boolean;
}

interface ChannelSearchContextType {
  // 채널 검색 상태
  channelQuery: string;
  setChannelQuery: (q: string) => void;
  foundChannels: FoundChannel[];
  setFoundChannels: (c: FoundChannel[]) => void;
  isSearchingChannels: boolean;
  setIsSearchingChannels: (b: boolean) => void;

  // 선택된 채널
  selectedChannel: SelectedChannel | null;
  setSelectedChannel: (c: SelectedChannel | null) => void;

  // 비디오 검색 상태
  videoQuery: string;
  setVideoQuery: (q: string) => void;
  filters: Partial<VideoSearchFilters>;
  setFilters: (f: Partial<VideoSearchFilters>) => void;

  // 비디오 결과
  videos: EnrichedVideo[];
  setVideos: (v: EnrichedVideo[]) => void;
  allVideos: EnrichedVideo[];
  setAllVideos: (v: EnrichedVideo[]) => void;

  // 정렬/필터
  sortBy: string;
  setSortBy: (s: string) => void;
  timePeriod: string;
  setTimePeriod: (p: string) => void;

  // 로딩/상태
  loading: boolean;
  setLoading: (b: boolean) => void;
  hasSearched: boolean;
  setHasSearched: (b: boolean) => void;
  isHydrated: boolean;

  // 유틸리티
  applySorting: (videoList: EnrichedVideo[], sortType: string) => void;
  clearChannelSearch: () => void;
}

const ChannelSearchContext = createContext<ChannelSearchContextType | undefined>(undefined);

function saveToStorage(state: PersistedState) {
  try {
    const optimized: PersistedState = {
      ...state,
      allVideos: state.allVideos.map(v => ({
        ...v,
        subtitleText: undefined,
        subtitleLanguage: undefined,
        description: v.description?.slice(0, 200),
      })),
    };
    const serialized = JSON.stringify(optimized);
    if (serialized.length > 4 * 1024 * 1024) {
      console.warn('Channel search state too large, skipping save');
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.error('Failed to save channel search state:', e);
  }
}

function loadFromStorage(): PersistedState | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to load channel search state:', e);
    return null;
  }
}

function sortVideos(videos: EnrichedVideo[], sortType: string): EnrichedVideo[] {
  const sorted = [...videos];
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
    case 'newest':
      sorted.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      break;
    case 'oldest':
      sorted.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
      break;
    case 'none':
    default:
      break;
  }
  return sorted;
}

export function ChannelSearchProvider({ children }: { children: ReactNode }) {
  // 채널 검색 상태
  const [channelQuery, setChannelQuery] = useState('');
  const [foundChannels, setFoundChannels] = useState<FoundChannel[]>([]);
  const [isSearchingChannels, setIsSearchingChannels] = useState(false);

  // 선택된 채널
  const [selectedChannel, setSelectedChannel] = useState<SelectedChannel | null>(null);

  // 비디오 검색 상태
  const [videoQuery, setVideoQuery] = useState('');
  const [filters, setFilters] = useState<Partial<VideoSearchFilters>>({
    videoDuration: 'any',
    order: 'date',
    maxResults: 50,
    regionCode: 'KR',
    fetchSubtitles: true,
  });

  // 비디오 결과
  const [videos, setVideos] = useState<EnrichedVideo[]>([]);
  const [allVideos, setAllVideos] = useState<EnrichedVideo[]>([]);

  // 정렬/필터
  const [sortBy, setSortBy] = useState('none');
  const [timePeriod, setTimePeriod] = useState('all');

  // 로딩/상태
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const applySorting = (videoList: EnrichedVideo[], sortType: string) => {
    const sorted = sortVideos(videoList, sortType);
    setVideos(sorted);
  };

  const clearChannelSearch = () => {
    setChannelQuery('');
    setFoundChannels([]);
    setSelectedChannel(null);
    setVideoQuery('');
    setFilters({
      videoDuration: 'any',
      order: 'date',
      maxResults: 50,
      regionCode: 'KR',
      fetchSubtitles: true,
    });
    setVideos([]);
    setAllVideos([]);
    setSortBy('none');
    setTimePeriod('all');
    setHasSearched(false);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  // Load from sessionStorage on mount
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      setChannelQuery(saved.channelQuery);
      setFoundChannels(saved.foundChannels);
      setSelectedChannel(saved.selectedChannel);
      setVideoQuery(saved.videoQuery);
      setFilters(saved.filters);
      setAllVideos(saved.allVideos);
      setSortBy(saved.sortBy);
      setTimePeriod(saved.timePeriod);
      setHasSearched(saved.hasSearched);
      // Apply sorting after restoring
      const sorted = sortVideos(saved.allVideos, saved.sortBy);
      setVideos(sorted);
    }
    setIsHydrated(true);
  }, []);

  // Save to sessionStorage on state change (debounced)
  useEffect(() => {
    if (!isHydrated) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveToStorage({
        channelQuery,
        foundChannels,
        selectedChannel,
        videoQuery,
        filters,
        allVideos,
        sortBy,
        timePeriod,
        hasSearched,
      });
    }, 300);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [channelQuery, foundChannels, selectedChannel, videoQuery, filters, allVideos, sortBy, timePeriod, hasSearched, isHydrated]);

  return (
    <ChannelSearchContext.Provider value={{
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
      clearChannelSearch,
    }}>
      {children}
    </ChannelSearchContext.Provider>
  );
}

export function useChannelSearch() {
  const context = useContext(ChannelSearchContext);
  if (context === undefined) {
    throw new Error('useChannelSearch must be used within a ChannelSearchProvider');
  }
  return context;
}
