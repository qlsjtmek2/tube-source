import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// =====================
// Type Definitions
// =====================

/**
 * 각 라인에서 추출된 키워드
 */
export interface FootageKeywords {
  line: number;
  text: string;
  korean: string[];    // 한글 키워드 2-3개
  english: string[];   // 영어 키워드 2-3개
}

/**
 * 검색 결과 (이미지 또는 영상)
 */
export interface FootageSearchResult {
  id: string;
  url: string;              // 원본 이미지/영상 URL
  downloadUrl: string;      // 다운로드 URL (고해상도)
  thumbnail: string;        // 썸네일 (영상의 경우)
  type: 'image' | 'video';
  source: 'unsplash' | 'pexels' | 'google';
  title?: string;
  author?: string;
  width: number;
  height: number;
}

/**
 * 라인별 검색 결과
 */
export interface LineSearchResults {
  line: number;
  text: string;
  keywords: { korean: string[]; english: string[] };
  results: {
    unsplash: FootageSearchResult[] | { error: string };
    pexels: FootageSearchResult[] | { error: string };
    google: FootageSearchResult[] | { error: string };
  };
}

// =====================
// Caching Strategy
// =====================

interface CacheEntry {
  result: any;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();

/**
 * 캐시에서 결과 조회 (10분 TTL)
 */
function getCachedResult(key: string): any | null {
  const cached = searchCache.get(key);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > 10 * 60 * 1000) { // 10분 초과
    searchCache.delete(key);
    return null;
  }

  return cached.result;
}

/**
 * 캐시에 결과 저장
 */
function setCachedResult(key: string, result: any): void {
  searchCache.set(key, { result, timestamp: Date.now() });
}

// =====================
// Gemini Keyword Extraction
// =====================

/**
 * Gemini를 사용하여 자막 라인에서 키워드 추출
 * @param lines 자막 라인 배열
 * @returns 각 라인의 키워드 배열
 */
export async function extractKeywordsBatch(lines: string[]): Promise<FootageKeywords[]> {
  const cacheKey = `keywords:${lines.join('|')}`;
  const cached = getCachedResult(cacheKey);
  if (cached) {
    console.log('[FootageSearch] Using cached keywords');
    return cached;
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    systemInstruction: `당신은 영상 편집을 위한 자료화면 검색 키워드 추출 전문가입니다.

## 목표
자막 텍스트에서 시각적 자료를 검색하기 위한 핵심 키워드를 추출합니다.

## 원칙
1. **구체성**: 추상적 개념보다 구체적인 시각 요소 우선
   - ❌ "행복" → ✅ "웃는 사람", "축하 파티"
   - ❌ "성공" → ✅ "우승 트로피", "비즈니스 미팅"

2. **검색 가능성**: 이미지/영상 검색에서 실제 결과가 나올 키워드
   - 고유명사는 일반명사로 변환 (예: "GPT" → "AI 로봇", "컴퓨터")
   - 맥락적 시각 요소 추출 (예: "코딩" → "컴퓨터 화면", "프로그래밍")

3. **다양성**: 한글/영어 키워드 각 2-3개 추출
   - 한글: 한국 콘텐츠에서 흔히 쓰이는 표현
   - 영어: 글로벌 이미지 라이브러리에 많은 표현

## 출력 형식
순수 JSON만 반환하십시오. Markdown 코드 블록 없이.

{
  "results": [
    {
      "line": 1,
      "korean": ["키워드1", "키워드2"],
      "english": ["keyword1", "keyword2"]
    }
  ]
}`
  });

  const prompt = `다음 자막 라인들에서 자료화면 검색 키워드를 추출하십시오.

${lines.map((text, idx) => `[라인 ${idx + 1}] ${text}`).join('\n')}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // JSON 추출 (Markdown 코드 블록 제거)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse Gemini response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const keywords: FootageKeywords[] = parsed.results.map((item: any, idx: number) => ({
      line: item.line,
      text: lines[idx],
      korean: item.korean || [],
      english: item.english || []
    }));

    setCachedResult(cacheKey, keywords);
    return keywords;

  } catch (error: any) {
    console.error('[FootageSearch] Keyword extraction failed:', error);
    // Fallback: 간단한 키워드 생성
    return lines.map((text, idx) => ({
      line: idx + 1,
      text,
      korean: [text.slice(0, 10)], // 앞 10자
      english: ['content', 'video'] // 기본 키워드
    }));
  }
}

// =====================
// Unsplash API Client
// =====================

/**
 * Unsplash에서 이미지 검색
 * @param query 검색 키워드 (한글+영어 혼합 가능)
 * @param limit 결과 개수 (기본 5개)
 */
export async function searchUnsplash(
  query: string,
  limit: number = 5
): Promise<FootageSearchResult[]> {
  const cacheKey = `unsplash:${query}:${limit}`;
  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.warn('[Unsplash] API key not configured');
    throw new Error('Unsplash API key not configured');
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${limit}&orientation=landscape`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    const results: FootageSearchResult[] = data.results.map((photo: any) => ({
      id: photo.id,
      url: photo.urls.regular,
      downloadUrl: photo.urls.full,
      thumbnail: photo.urls.small,
      type: 'image' as const,
      source: 'unsplash' as const,
      title: photo.description || photo.alt_description || '',
      author: photo.user.name,
      width: photo.width,
      height: photo.height
    }));

    setCachedResult(cacheKey, results);
    return results;

  } catch (error: any) {
    console.error('[Unsplash] Search failed:', error);
    throw error;
  }
}

// =====================
// Pexels API Client
// =====================

/**
 * Pexels에서 이미지 및 영상 검색
 * @param query 검색 키워드
 * @param limit 결과 개수 (기본 5개)
 */
export async function searchPexels(
  query: string,
  limit: number = 5
): Promise<FootageSearchResult[]> {
  const cacheKey = `pexels:${query}:${limit}`;
  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn('[Pexels] API key not configured');
    throw new Error('Pexels API key not configured');
  }

  try {
    // Photos 검색
    const photosUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${Math.ceil(limit / 2)}&orientation=landscape`;
    const photosResponse = await fetch(photosUrl, {
      headers: { 'Authorization': apiKey }
    });

    // Videos 검색
    const videosUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${Math.floor(limit / 2)}&orientation=landscape`;
    const videosResponse = await fetch(videosUrl, {
      headers: { 'Authorization': apiKey }
    });

    const [photosData, videosData] = await Promise.all([
      photosResponse.ok ? photosResponse.json() : { photos: [] },
      videosResponse.ok ? videosResponse.json() : { videos: [] }
    ]);

    const photoResults: FootageSearchResult[] = (photosData.photos || []).map((photo: any) => ({
      id: photo.id.toString(),
      url: photo.src.large,
      downloadUrl: photo.src.original,
      thumbnail: photo.src.medium,
      type: 'image' as const,
      source: 'pexels' as const,
      title: photo.alt || '',
      author: photo.photographer,
      width: photo.width,
      height: photo.height
    }));

    const videoResults: FootageSearchResult[] = (videosData.videos || []).map((video: any) => ({
      id: video.id.toString(),
      url: video.video_files[0]?.link || '',
      downloadUrl: video.video_files[0]?.link || '',
      thumbnail: video.image,
      type: 'video' as const,
      source: 'pexels' as const,
      title: video.user?.name || '',
      author: video.user?.name || '',
      width: video.width,
      height: video.height
    }));

    const results = [...photoResults, ...videoResults].slice(0, limit);
    setCachedResult(cacheKey, results);
    return results;

  } catch (error: any) {
    console.error('[Pexels] Search failed:', error);
    throw error;
  }
}

// =====================
// Google Custom Search API Client
// =====================

/**
 * Google Custom Search로 이미지 검색
 * @param query 검색 키워드
 * @param limit 결과 개수 (기본 5개, 최대 10개)
 */
export async function searchGoogleImages(
  query: string,
  limit: number = 5
): Promise<FootageSearchResult[]> {
  const cacheKey = `google:${query}:${limit}`;
  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cseId) {
    console.warn('[Google] API key or CSE ID not configured');
    throw new Error('Google API key or CSE ID not configured');
  }

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}&searchType=image&num=${Math.min(limit, 10)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    const results: FootageSearchResult[] = (data.items || []).map((item: any) => ({
      id: item.link,
      url: item.link,
      downloadUrl: item.link,
      thumbnail: item.image?.thumbnailLink || item.link,
      type: 'image' as const,
      source: 'google' as const,
      title: item.title || '',
      author: item.displayLink || '',
      width: item.image?.width || 0,
      height: item.image?.height || 0
    }));

    setCachedResult(cacheKey, results);
    return results;

  } catch (error: any) {
    console.error('[Google] Search failed:', error);
    throw error;
  }
}

// =====================
// Integrated Search
// =====================

/**
 * 모든 소스에서 병렬 검색 (부분 실패 허용)
 * @param keywords 키워드 객체
 */
export async function searchAllSources(keywords: FootageKeywords): Promise<LineSearchResults> {
  // 한글+영어 키워드를 공백으로 연결
  const combinedQuery = [...keywords.korean, ...keywords.english].join(' ');

  // 3개 소스 병렬 검색
  const [unsplashResult, pexelsResult, googleResult] = await Promise.allSettled([
    searchUnsplash(combinedQuery, 5),
    searchPexels(combinedQuery, 5),
    searchGoogleImages(combinedQuery, 5)
  ]);

  return {
    line: keywords.line,
    text: keywords.text,
    keywords: {
      korean: keywords.korean,
      english: keywords.english
    },
    results: {
      unsplash: unsplashResult.status === 'fulfilled'
        ? unsplashResult.value
        : { error: unsplashResult.reason?.message || 'Search failed' },
      pexels: pexelsResult.status === 'fulfilled'
        ? pexelsResult.value
        : { error: pexelsResult.reason?.message || 'Search failed' },
      google: googleResult.status === 'fulfilled'
        ? googleResult.value
        : { error: googleResult.reason?.message || 'Search failed' }
    }
  };
}
