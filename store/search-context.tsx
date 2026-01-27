"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { EnrichedVideo, VideoSearchFilters } from '@/lib/youtube';

const STORAGE_KEY = 'tubesource-search-state';

interface PersistedState {
  query: string;
  filters: Partial<VideoSearchFilters>;
  timePeriod: string;
  sortBy: string;
  allVideos: EnrichedVideo[];
  hasSearched: boolean;
}

interface SearchContextType {
  query: string;
  setQuery: (q: string) => void;
  filters: Partial<VideoSearchFilters>;
  setFilters: (f: Partial<VideoSearchFilters>) => void;
  videos: EnrichedVideo[];
  setVideos: (v: EnrichedVideo[]) => void;
  hasSearched: boolean;
  setHasSearched: (b: boolean) => void;
  timePeriod: string;
  setTimePeriod: (p: string) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  allVideos: EnrichedVideo[];
  setAllVideos: (v: EnrichedVideo[]) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
  applySorting: (videoList: EnrichedVideo[], sortType: string) => void;
  clearSearch: () => void;
  isHydrated: boolean;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

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
      console.warn('Search state too large, skipping save');
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.error('Failed to save search state:', e);
  }
}

function loadFromStorage(): PersistedState | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to load search state:', e);
    return null;
  }
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Partial<VideoSearchFilters>>({
    videoDuration: 'any',
    order: 'relevance',
    maxResults: 100,
    regionCode: 'KR',
    fetchSubtitles: true,
    minSubscribers: undefined,
    maxSubscribers: undefined,
    minPerformanceRatio: undefined,
  });
  const [videos, setVideos] = useState<EnrichedVideo[]>([]);
  const [allVideos, setAllVideos] = useState<EnrichedVideo[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [timePeriod, setTimePeriod] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('none');
  const [loading, setLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const applySorting = (videoList: EnrichedVideo[], sortType: string) => {
    const sorted = [...videoList];

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
        break;
    }

    setVideos(sorted);
  };

  const clearSearch = () => {
    setQuery('');
    setFilters({
      videoDuration: 'any',
      order: 'relevance',
      maxResults: 100,
      regionCode: 'KR',
      fetchSubtitles: true,
      minSubscribers: undefined,
      maxSubscribers: undefined,
      minPerformanceRatio: undefined,
    });
    setTimePeriod('all');
    setSortBy('none');
    setVideos([]);
    setAllVideos([]);
    setHasSearched(false);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  // Load from sessionStorage on mount
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      setQuery(saved.query);
      setFilters(saved.filters);
      setTimePeriod(saved.timePeriod);
      setSortBy(saved.sortBy);
      setAllVideos(saved.allVideos);
      setHasSearched(saved.hasSearched);
      // Apply sorting after restoring
      const sorted = [...saved.allVideos];
      switch (saved.sortBy) {
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
        default:
          break;
      }
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
        query,
        filters,
        timePeriod,
        sortBy,
        allVideos,
        hasSearched,
      });
    }, 300);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [query, filters, timePeriod, sortBy, allVideos, hasSearched, isHydrated]);

  return (
    <SearchContext.Provider value={{
      query, setQuery,
      filters, setFilters,
      videos, setVideos,
      hasSearched, setHasSearched,
      timePeriod, setTimePeriod,
      sortBy, setSortBy,
      allVideos, setAllVideos,
      loading, setLoading,
      applySorting,
      clearSearch,
      isHydrated,
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
