# GEMINI.md

This file provides guidance to Gemini (or Claude Code) when working with code in this repository.

## Project Overview

**Video Source Collector** (또는 TubeSource)는 유튜브 영상 분석 및 다운로드를 제공하는 개인용 콘텐츠 크리에이터 도구입니다.

- **Tech Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Shadcn/UI
- **External Services**: YouTube Data API v3, Google Gemini API (gemini-3-flash-preview), yt-dlp
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
    download/route.ts       # yt-dlp 다운로드 API (POST)
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
  ui/                       # Shadcn/UI primitives (button, dialog, skeleton 등)

lib/
  youtube.ts                # YouTube API 검색 로직, 채널 상세 정보, 심화 지표 계산
  downloader.ts             # yt-dlp wrapper (progress tracking)
  ai.ts                     # Gemini API 분석 로직 (자막, 댓글 포함)
  subtitles.ts              # yt-dlp 자막 추출 로직 (JSON3 포맷)
  storage.ts                # Local JSON storage (채널, 분석 기록)
  utils.ts                  # Tailwind utility (cn)

store/
  search-context.tsx        # Global state (검색어, 필터, 영상 결과 - 영상 검색 전용)

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
   - **Recursive Fetching**: `searchVideos()` fetches videos recursively until `maxResults` is met, applying `minSubscribers` and `minPerformanceRatio` filters in memory.
   - Subtitles are fetched only for valid videos to save resources.
   - Returns `EnrichedVideo[]` with calculated metrics (engagementRate, performanceRatio).

2. **Channel Search & Load Flow**
   - **Search**: User searches channel by name → `/api/channels/search` → `lib/youtube.ts:searchChannels()`
   - **Details**: User clicks channel name → `ChannelDetailDialog` fetches details via `/api/channels/details`
   - **Load Videos**: User clicks "채널 검색 탭으로 불러오기" → Switch to Channel Search tab → Call `/api/search` with `channelId`
   - **Persistence**: Channel Search tab has its own internal state, independent of the main Search tab.

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
   - **Cancellation**: User can stop batch analysis mid-process (AbortController).

4. **Comments Analysis Flow**
   - User clicks Comment icon → `/api/comments` → `lib/youtube.ts:getTopComments()`
   - Fetches relevant comments using YouTube Data API.
   - Displayed in `CommentsDialog`.

5. **Analyzed Videos History Flow**
   - Analysis results are automatically saved to `data/analyzed-videos.json`.
   - Viewed in "분석 결과" tab.

### Key Features & UX

- **Advanced Filters**: Country, Duration, Date, Count, **Subscribers (Min/Max)**, **Performance (Min %)**.
- **Channel Analysis**: View subscriber count, total views, video count, last upload date, and more.
- **Context Analysis**: Analyze multiple videos to find overarching patterns and common success strategies.
- **Video Removal**: Delete unwanted videos from search results instantly.
- **Korean Localization**: Number formatting using Korean units (천, 만, 억) for better readability.
- **Compact UI**: Optimized spacing for high information density.
- **Batch Analysis**: Inline progress bar, parallel processing, cancellation support.
- **Visual Feedback**: Red theme (branding), purple theme for reports, interactive buttons, hover effects.
- **Smart Selection**: Selection mode automatically deactivates after starting analysis to streamline workflow.

### API Integration

- **YouTube API**: `search.list` (recursive, channelId supported), `videos.list`, `channels.list`, `commentThreads.list`.
- **Gemini API**: `gemini-3-flash-preview` (System Prompt: Content Strategy Expert & Psychologist).
- **yt-dlp**: Video download & Subtitle extraction.

## Important Implementation Details

### Recursive Fetching Strategy
Since YouTube API doesn't support filtering by subscriber count or performance ratio directly:
1. Fetch a batch of 50 videos.
2. Filter them in memory based on user criteria (subs, ratio).
3. If not enough videos, fetch next page recursively.
4. Repeat until `maxResults` reached or page limit (5) hit.
5. Deduplicate results to prevent key errors.

### Batch Analysis Concurrency
- `handleBatchAnalyze` processes videos in chunks of 3.
- Uses `Promise.all` for parallel requests.
- `AbortController` allows immediate cancellation of pending requests.

### UI Styling
- **Primary Color**: `red-600` (matches YouTube branding).
- **Button Styling**: `!important` modifiers used to override Shadcn defaults for consistent colors.
- **Dialogs**: 
  - `max-w` constrained based on screen size (e.g., `lg:max-w-6xl`).
  - `max-h` used instead of fixed height for better response to content size.
  - **Accessibility**: All `DialogContent` must contain a `DialogTitle` (use `sr-only` if not visually needed).

## Future Expansion Points

- Download queue management.
- Export analysis results to PDF/Notion.
- YouTube API quota monitoring dashboard.