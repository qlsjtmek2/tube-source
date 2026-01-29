# GEMINI.md

This file provides guidance to Gemini (or Claude Code) when working with code in this repository.

## Project Overview

**Video Source Collector** (또는 TubeSource)는 유튜브 영상 분석 및 다운로드를 제공하는 개인용 콘텐츠 크리에이터 도구입니다.

- **Tech Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Shadcn/UI
- **External Services**: YouTube Data API v3, Google Gemini API (gemini-3-flash-preview), yt-dlp (TikTok 지원)
- **Data Storage**: Local JSON files (`data/channels.json`, `data/analyzed-videos.json`)

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
  api/
    search/route.ts         # YouTube 검색 API (POST) - channelId 필터링 지원 (q가 없어도 동작)
    download/route.ts       # yt-dlp 다운로드 API (POST) - YouTube 및 TikTok 지원
    analyze/route.ts        # Gemini AI 분석 API (POST)
    analyze/context/route.ts # 여러 영상 종합 맥락 분석 API (POST)
    analyzed-videos/route.ts # 분석된 영상 저장/조회 API (GET/POST/DELETE)
    channels/route.ts       # 채널 저장/조회 API (GET/POST/DELETE)
    channels/search/route.ts # 채널명으로 검색 API (GET)
    channels/details/route.ts # 실시간 채널 상세 정보 조회 API (GET)
    trends/route.ts         # 실시간 트렌드 API (GET)
    comments/route.ts       # 베스트 댓글 조회 API (GET)
  page.tsx                  # Main UI (영상 검색, 채널 검색, 관심 채널, 트렌드, 분석 결과 탭)
  layout.tsx                # Root layout with SearchProvider
  globals.css               # Tailwind + custom styles

components/
  video-card.tsx            # 영상 카드 (채널명 클릭 시 상세 정보 모달 트리거)
  report-card.tsx           # AI 맥락 분석 리포트 전용 카드 (디자인 특화)
  video-list.tsx            # 영상 리스트 컨테이너 (일반 영상/리포트 분기 렌더링)
  download-dialog.tsx       # 다운로드 다이얼로그 (MP4/MP3 선택)
  analysis-dialog.tsx       # AI 분석 결과 다이얼로그 (와이드 레이아웃 lg:max-w-6xl 지원)
  channel-detail-dialog.tsx # 채널 상세 지표 및 정보 모달 (Skeleton 로딩 지원)
  subtitle-dialog.tsx       # 자막 표시 다이얼로그
  comments-dialog.tsx       # 베스트 댓글 표시 다이얼로그
  batch-process-bar.tsx     # 일괄 분석 진행 상황 표시 바 (Inline)
  batch-process-stack.tsx   # 다중 일괄 작업 스택 관리자
  batch-analysis-dialog.tsx # 일괄 분석 플로팅 다이얼로그 (Bottom-Right)
  ui/                       # Shadcn/UI primitives (button, dialog, skeleton 등)

lib/
  youtube.ts                # YouTube API 검색 로직. 채널 전체 검색 시 playlistItems API 사용 최적화.
  downloader.ts             # yt-dlp wrapper. YouTube 및 TikTok URL 자동 감지 및 클리닝.
  ai.ts                     # Gemini API 분석 로직 (자막, 댓글 포함)
  subtitles.ts              # yt-dlp 자막 추출 로직 (JSON3 포맷)
  storage.ts                # Local JSON storage (채널, 분석 기록)
  utils.ts                  # Tailwind utility (cn)

store/
  search-context.tsx        # Global state (검색어, 필터, 영상 결과 - 영상 검색 전용)
  channel-search-context.tsx # Channel search state management

data/
  channels.json             # 저장된 채널 목록 (런타임에 자동 생성)
  analyzed-videos.json      # 저장된 AI 분석 결과 (런타임에 자동 생성)

downloads/                  # yt-dlp 다운로드 경로 (런타임에 자동 생성)
```

### Core Data Flow

1. **YouTube Search Flow**
   - User inputs query → `app/page.tsx` (Search tab)
   - State managed by `SearchContext` (store/search-context.tsx)
   - API call to `/api/search` → `lib/youtube.ts`
   - **Recursive Fetching**: `searchVideos()` fetches videos recursively until `maxResults` is met.
   - **Optimization**: If searching *all* videos in a channel (no query, maxResults=0), it switches to `playlistItems.list` API to bypass the 500-item limit and save quota cost.
   - Subtitles are fetched only for valid videos to save resources.
   - Returns `EnrichedVideo[]` with calculated metrics (engagementRate, performanceRatio).

2. **Channel Search & Load Flow**
   - **Search**: User searches channel by name → `/api/channels/search` → `lib/youtube.ts:searchChannels()`
   - **Details**: User clicks channel name → `ChannelDetailDialog` fetches details via `/api/channels/details`
   - **Load Videos**: User clicks "채널 검색 탭으로 불러오기" → Switch to Channel Search tab → Call `/api/search` with `channelId`
   - **Filters**: Supports `minPerformanceRatio` (lower bound) and client-side sorting (Newest/Oldest).

3. **AI Analysis Flow (Single, Batch & Context)**
   - **Single**: User clicks Analyze → `/api/analyze` → Gemini API (gemini-3-flash-preview)
   - **Batch**: User selects videos → `BatchProcessBar` shows progress → Parallel API calls (concurrency: 3)
   - **Context (Multi-Video)**: User selects videos → `handleContextAnalyze` → `/api/analyze/context` → Gemini API
     - Analyzes commonalities, market trends, insights, and action plans across multiple videos.
     - Saved as a special `ReportCard` in the history.
   - **Context Data**: Video metadata (Views, Likes, Comments, Date) + Subtitles + **Top 20 Best Comments**.
   - **Prompt Engineering**:
     - **Persona**: Content Strategy Expert & Behavioral Psychologist.
     - **Framework**: Socratic method used to derive Hook, Structure, Target, Community Needs, Insights.
     - **Techniques**: Structured contexts using delimiters, explicit output format control, and role-based behavior.

4. **Analyzed Videos History Flow**
   - Analysis results are automatically saved to `data/analyzed-videos.json`.
   - Viewed in "분석 결과" tab.
   - **Filtering**: Can filter by Channel and Analysis Type (Single vs Context).
   - **Export**: Can export displayed results to PDF.

5. **Download Flow**
   - User inputs URL → `app/page.tsx` (Download tab)
   - URL Regex supports **YouTube** and **TikTok**.
   - API call to `/api/download` → `lib/downloader.ts` → `yt-dlp` spawn.
   - Server-Sent Events (SSE) used for real-time progress updates.

## Code Conventions & Best Practices (2025)

### Tailwind CSS v4 Architecture
- **Semantic Colors**: Use `globals.css` `@theme` variables (e.g., `--danger`, `--info`, `--muted`) instead of hardcoded hex values or utility colors (`bg-red-500`).
- **No JS-in-CSS**: Avoid inline styles (`style={{ ... }}`) and JS-driven hover states (`onMouseEnter`). Use `cva` and Tailwind utilities (`hover:bg-accent`).
- **Layouts**: Prefer relative units and aspect ratios (`aspect-[3/4]`, `w-full`) over fixed pixels (`h-[340px]`, `w-[320px]`).
- **DarkMode**: Use OKLCH color space for better gamut and perceived lightness consistency.

### Component Guidelines
- **UI Purity**: `components/ui/*` should contain style logic only. No business logic or API calls.
- **Composition**: Break down complex UIs (like dialogs) into smaller, reusable sub-components (e.g., `AnalysisSection`) to reduce duplication.
- **Type Safety**: Use strict TypeScript interfaces for props, especially for data models like `EnrichedVideo` and `ChannelDetails`.

### Important Implementation Details

- **Recursive Fetching Strategy**: Filter videos in memory after fetching batches to support advanced filters not native to YouTube API.
- **Batch Analysis**: Use `Promise.all` with concurrency control (max 3) for efficient AI processing.
- **UI Styling**: Primary color is `red-600` (YouTube brand). All dialogs must be accessible with titles.

## Future Expansion Points

- YouTube API quota monitoring dashboard.
- Advanced visualization for trend analysis.