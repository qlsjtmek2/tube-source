"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { EnrichedVideo, VideoSearchFilters } from '@/lib/youtube';

interface SearchContextType {
  query: string;
  setQuery: (q: string) => void;
  filters: Partial<VideoSearchFilters>;
  setFilters: (f: Partial<VideoSearchFilters>) => void;
  videos: EnrichedVideo[];
  setVideos: (v: EnrichedVideo[]) => void;
  hasSearched: boolean;
  setHasSearched: (b: boolean) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Partial<VideoSearchFilters>>({
    videoDuration: 'any',
    order: 'relevance',
  });
  const [videos, setVideos] = useState<EnrichedVideo[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  return (
    <SearchContext.Provider value={{
      query, setQuery,
      filters, setFilters,
      videos, setVideos,
      hasSearched, setHasSearched
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
