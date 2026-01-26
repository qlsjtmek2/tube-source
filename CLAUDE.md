# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Video Source Collector** (또는 TubeSource)는 유튜브 영상 분석 및 다운로드를 제공하는 개인용 콘텐츠 크리에이터 도구입니다.

- **Tech Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Shadcn/UI
- **External Services**: YouTube Data API v3, Google Gemini API (gemini-3-flash-preview), yt-dlp
- **Data Storage**: Local JSON files (data/channels.json)

## Common Commands

```bash
# Development server (사용자가 직접 실행해야 함 - 장기 실행 프로세스)
npm run dev  # http://localhost:3000

# Build and start production
npm run build
npm run start

# Linting
npm run lint
```

## Architecture Overview

### Directory Structure

```
app/
  api/                      # Next.js API Routes
    search/route.ts         # YouTube 검색 API (POST)
    download/route.ts       # yt-dlp 다운로드 API (POST)
    analyze/route.ts        # Gemini AI 분석 API (POST)
    channels/route.ts       # 채널 저장/조회 API (GET/POST/DELETE)
    trends/route.ts         # 실시간 트렌드 API (GET)
  page.tsx                  # Main UI (검색, 결과, 트렌드 탭)
  layout.tsx                # Root layout with SearchProvider
  globals.css               # Tailwind + custom styles

components/
  video-card.tsx            # 영상 카드 (다운로드/분석 버튼 포함)
  video-list.tsx            # 영상 리스트 컨테이너
  download-dialog.tsx       # 다운로드 다이얼로그 (MP4/MP3 선택)
  analysis-dialog.tsx       # AI 분석 결과 다이얼로그
  ui/                       # Shadcn/UI primitives (button, dialog, tabs 등)

lib/
  youtube.ts                # YouTube API 검색 로직 + 심화 지표 계산
  downloader.ts             # yt-dlp wrapper (progress tracking)
  ai.ts                     # Gemini API 분석 로직
  storage.ts                # Local JSON storage (채널 즐겨찾기)
  utils.ts                  # Tailwind utility (cn)

store/
  search-context.tsx        # Global state (검색어, 필터, 영상 결과)

data/
  channels.json             # 저장된 채널 목록 (런타임에 자동 생성)

downloads/                  # yt-dlp 다운로드 경로 (런타임에 자동 생성)
```

### Core Data Flow

1. **YouTube Search Flow**
   - User inputs query → `app/page.tsx` (Search tab)
   - State managed by `SearchContext` (store/search-context.tsx)
   - API call to `/api/search` → `lib/youtube.ts`
   - `searchVideos()` fetches video IDs, video details, channel details in parallel
   - Returns `EnrichedVideo[]` with calculated metrics (engagementRate, performanceRatio)

2. **Video Download Flow**
   - User clicks Download → `DownloadDialog` opens
   - POST to `/api/download` with `{ videoId, format: 'mp4' | 'mp3' }`
   - Server spawns `yt-dlp` process via `lib/downloader.ts`
   - Streams progress via SSE-like output parsing
   - Files saved to `downloads/` directory

3. **AI Analysis Flow**
   - User clicks Analyze → `AnalysisDialog` opens
   - POST to `/api/analyze` with video metadata
   - `lib/ai.ts` calls Gemini API with structured prompt (한국어)
   - Returns JSON: `{ hook, structure, target, insights[] }`
   - Displayed in modal with formatted sections

4. **Channel Management Flow**
   - User saves channel → POST to `/api/channels`
   - `lib/storage.ts` appends to `data/channels.json`
   - GET `/api/channels` retrieves saved channels list
   - DELETE removes channel by ID

### Key TypeScript Interfaces

```typescript
// lib/youtube.ts
interface EnrichedVideo {
  id: string;
  title: string;
  channelId: string;
  channelTitle: string;
  channelThumbnail: string;     // Channel profile picture URL
  viewCount: number;
  subscriberCount: number;
  engagementRate: number;      // ((Likes + Comments) / Views) * 100
  performanceRatio: number;     // (Video Views / Subscriber Count) * 100
  // ... 기타 필드
}

interface VideoSearchFilters {
  q: string;
  publishedAfter?: string;
  publishedBefore?: string;
  regionCode?: string;
  videoDuration?: 'any' | 'long' | 'medium' | 'short';
  order?: 'date' | 'rating' | 'relevance' | 'viewCount' | 'title';
  creativeCommons?: boolean;
  maxResults?: number; // 1-100, default: 100
}
```

## API Integration

### Environment Variables

Required in `.env.local`:
```bash
YOUTUBE_API_KEY=your-youtube-api-key
GEMINI_API_KEY=your-gemini-api-key
```

See `.env.example` for template.

### YouTube API Usage

- Uses `googleapis` library (`google.youtube`)
- Search API → Videos API → Channels API (3-step enrichment)
- **Important**: YouTube API allows max 50 IDs per call
  - `search.list()`: 페이지네이션으로 100개까지 가능 (50개씩 2번 호출)
  - `videos.list()`: chunking으로 100개 처리 (50개씩 2번 호출)
  - `channels.list()`: chunking으로 처리 (50개씩)

#### API Quota Management
- **Daily Limit**: 10,000 units (무료 tier, 매일 자정 PST 리셋)
- **Cost per request**:
  - `search.list()`: 100 units
  - `videos.list()`: 1 unit
  - `channels.list()`: 1 unit
- **Example**: 100개 영상 검색 1회 = 약 204 units (search 200 + videos 2 + channels 2)
- **Daily capacity**: 약 49회 검색 (100개 기준)
- 할당량 초과 시 403 에러 발생, 다음날까지 대기 필요

### Gemini API Usage

- Model: `gemini-3-flash-preview` (lib/ai.ts:6)
- Prompt: 한국어로 작성된 4-step 분석 (Hook, Structure, Target, Insights)
- Response: JSON 형식 (sometimes wrapped in \`\`\`json, extracted via regex)

### yt-dlp Integration

- Must be installed globally: `brew install yt-dlp` (macOS)
- Spawned as child process in `lib/downloader.ts`
- Progress tracked via stdout parsing (`%(progress._percent_str)s`)
- MP3: `-x --audio-format mp3`
- MP4: `-f 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'`

## Shadcn/UI Configuration

- Style: `new-york`
- Base color: `neutral`
- CSS variables enabled
- Components installed: Avatar, Button, Dialog, Label, Progress, ScrollArea, Select, Separator, Slot, Tabs
- Import path: `@/components/ui/*`

## State Management

- **Global Search State**: `SearchContext` (store/search-context.tsx)
  - Holds: query, filters, videos[], hasSearched
  - Wrapped in `SearchProvider` (app/layout.tsx)
- **Local Component State**: Dialog modals, form inputs
- No external state libraries (Redux, Zustand) - uses React Context

## Important Implementation Details

### Metric Calculation

`lib/youtube.ts`에서 계산되는 심화 지표:
- **engagementRate**: `((likeCount + commentCount) / viewCount) * 100`
- **performanceRatio**: `(viewCount / subscriberCount) * 100`
  - 구독자 대비 영상 조회수 비율 (채널 기여도 proxy)

### Storage Pattern

- `lib/storage.ts`는 `data/channels.json`을 직접 읽고 쓴다
- `initStorage()`로 디렉토리/파일 자동 생성
- 중복 채널 저장 방지: `channels.find(c => c.channelId === channel.channelId)`

### Progress Tracking Pattern

- `lib/downloader.ts`의 `downloadVideo()`는 callback 함수 `onProgress` 사용
- `DownloadDialog`에서 state로 progress string을 받아 UI 업데이트

### AI Response Parsing

- Gemini가 JSON을 \`\`\`json으로 감쌀 때가 있음
- `lib/ai.ts:36`에서 regex로 JSON 추출: `/\{[\s\S]*\}/`

## Known Patterns and Conventions

- **API Routes**: POST로 body를 받아 처리, GET으로 단순 조회
- **Error Handling**: console.error + throw (API routes에서 Next.js가 자동으로 500 응답)
- **File Naming**: kebab-case for files, PascalCase for React components
- **Import Alias**: `@/` = project root (configured in tsconfig.json)
- **React Server Components**: 기본적으로 모든 컴포넌트는 RSC, "use client" directive는 state/context 사용 시

## Search Filters Implementation

### YouTube API Filters
- **maxResults**: 1-100 (수집 개수 제한)
  - YouTube API는 한 번에 최대 50개만 반환
  - 51-100개 요청 시 자동으로 페이지네이션 처리 (`lib/youtube.ts`)
- **regionCode**: 국가 코드 (KR, US, JP, GB, IN, CN, FR, DE 등)
- **publishedAfter**: 기간 필터 (1일, 1주일, 1개월, 3개월, 6개월, 1년, 모두)
  - 클라이언트에서 계산하여 ISO 8601 형식으로 전달
- **order**: YouTube API 정렬 기준 (relevance, date, viewCount, rating, title)
- **videoDuration**: 영상 길이 (any, short, medium, long)
- **creativeCommons**: CC 라이선스 필터

### Client-Side Sorting
검색 결과를 받은 후 클라이언트에서 재정렬:
- **none**: 정렬 안함 (YouTube API 결과 순서 유지)
- **views**: 조회수 높은순
- **subscribers**: 구독자수 높은순
- **performance**: 성과도 높은순 (performanceRatio)
- **engagement**: 참여율 높은순 (engagementRate)
- **likes**: 좋아요 많은순
- **comments**: 댓글 많은순

**UI 구현**: 버튼 그룹 형태로 구현되어 클릭 시 활성화 표시
- 검색 결과가 있을 때만 표시되는 별도 Card 섹션
- 선택된 버튼: `variant="default"` (파란색)
- 비선택 버튼: `variant="outline"` (회색)

`app/page.tsx`의 `SearchSection`에서:
1. YouTube API로 영상 검색 → `allVideos` 저장
2. 클라이언트 정렬 적용 → `videos` 업데이트
3. `sortBy` 변경 시 자동 재정렬 (useEffect, API 재호출 불필요)

## Lessons Learned

- `yt-dlp` 출력 파싱 시 `--newline` 플래그가 필수 (줄바꿈 보장)
- YouTube API의 `videos.list()`에서 id 배열을 전달할 때 `join(',')`보다 배열로 직접 전달하는 게 안전
- Gemini API 응답은 항상 JSON으로 오지 않으므로 regex fallback 필요
- `data/` 및 `downloads/` 폴더는 .gitignore에 포함 (런타임 생성)
- 기간 필터는 `publishedAfter`로 구현 (현재 시간 - N일을 ISO 8601 형식으로 계산)

### YouTube API 최적화
- **50개 제한**: `search.list()`, `videos.list()`, `channels.list()` 모두 최대 50개 ID 제한
  - 51-100개 처리 시 모든 API에서 chunking/pagination 필수
- **페이지네이션**: `nextPageToken`으로 다음 페이지 가져오기
- **중복 제거**: 페이지네이션 시 같은 영상이 중복될 수 있어 `Set`으로 videoIds 중복 제거 필요
- **할당량 관리**: 무료 tier는 하루 10,000 units, search.list가 100 units로 가장 비쌈
  - 개발 중에는 수집 개수를 줄여서 할당량 절약 권장

### 클라이언트 사이드 처리
- **정렬**: YouTube API 결과를 받은 후 성과도, 참여율 등 계산된 지표로 재정렬 가능
- **중복 방지**: React key 오류 방지를 위해 videoIds를 Set으로 중복 제거

### 채널 데이터
- **채널 썸네일**: `channels.list()`에서 `snippet.thumbnails`로 프로필 사진 가져오기
- 관심 채널 저장 시 썸네일도 함께 저장하여 UI에 표시

## Future Expansion Points

- 무한 스크롤 구현 (현재는 최대 100개)
- 관심 채널 탭에서 특정 채널의 모든 영상 불러오기
- 다운로드 큐 및 히스토리 관리
- AI 분석 결과 로컬 저장 및 비교 기능
- YouTube API 할당량 모니터링 UI
- 검색 히스토리 및 즐겨찾는 검색 필터 저장
