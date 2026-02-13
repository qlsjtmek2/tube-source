# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Video Source Collector** (또는 TubeSource)는 유튜브, TikTok 및 레딧 영상 분석 및 다운로드를 제공하는 콘텐츠 크리에이터 SaaS 플랫폼입니다.

- **Tech Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Shadcn/UI
- **Database**: Supabase (PostgreSQL) + RLS 보안 적용
- **Auth**: Supabase Auth (Email 로그인) + Next.js Middleware
- **Deployment**: Vultr VPS (Ubuntu 24.04 LTS, Seoul Region) + Docker + GitHub Actions CI/CD
- **Payment**: Portone V2 (카카오페이, 네이버페이 등 국내 간편결제)
- **External Services**: YouTube Data API v3, Google Gemini API (gemini-3-flash-preview), yt-dlp
- **Supported Platforms**: YouTube (검색, 분석, 다운로드), TikTok (다운로드 전용), Reddit (다운로드 전용)

## Common Commands

```bash
# Development server (사용자가 직접 실행해야 함 - 장기 실행 프로세스)
npm run dev  # http://localhost:3000

# Build and start production
npm run build
npm run start

# Linting
npm run lint

# Docker (프로덕션 빌드)
docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=... --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... -t video-source-collector .
```

## Architecture Overview

### Directory Structure

```
app/
  page.tsx                    # Server Component 래퍼 (dynamic = 'force-dynamic')
  home-content.tsx            # Main UI Client Component (영상검색, 채널검색, 관심채널, 트렌드, 분석결과, 다운로드, 자료화면검색 탭)
  layout.tsx                  # Root layout with SearchProvider + ChannelSearchProvider
  globals.css                 # Tailwind + custom styles
  login/
    page.tsx                  # Server Component 래퍼 (dynamic = 'force-dynamic')
    login-form.tsx            # 로그인/회원가입 Client Component (Supabase Auth)
  api/
    search/route.ts           # YouTube 검색 API (POST)
    download/route.ts         # yt-dlp 다운로드 API (GET, SSE)
    download/open/route.ts    # 다운로드 폴더 열기 API (POST)
    analyze/route.ts          # Gemini AI 분석 API (POST, 인증+Quota 체크)
    analyze/context/route.ts  # 맥락 분석 API (POST, PRO 전용)
    analyzed-videos/route.ts  # 분석 결과 CRUD API
    channels/route.ts         # 채널 저장/조회 API (GET/POST/DELETE, 인증 필수)
    channels/details/         # 채널 상세 정보 API
    channels/search/          # 채널 검색 API
    comments/route.ts         # YouTube 댓글 조회 API
    trends/route.ts           # 실시간 트렌드 API (GET)
    footage-search/route.ts   # 자료화면 검색 API (POST, 페이지네이션 지원)
    payment/confirm/route.ts  # Portone V2 결제 검증 API (POST, 서버사이드 검증)
    user/profile/route.ts     # 유저 프로필 조회 API (GET)

middleware.ts                 # Supabase 세션 갱신 + 인증 가드 (로그인 리다이렉트)

components/
  video-card.tsx              # 영상 카드 (다운로드/분석/자막 버튼 포함)
  video-list.tsx              # 영상 리스트 컨테이너
  download-dialog.tsx         # 다운로드 다이얼로그 (MP4/MP3 선택, YouTube/TikTok/Reddit 지원)
  analysis-dialog.tsx         # AI 분석 결과 다이얼로그 (확장된 분석 섹션 포함)
  batch-analysis-dialog.tsx   # 배치 분석 설정 다이얼로그
  subtitle-dialog.tsx         # 자막 표시 다이얼로그
  comments-dialog.tsx         # YouTube 댓글 표시 다이얼로그
  footage-search-dialog.tsx   # 자료화면 검색 다이얼로그 (Gemini 키워드 추출 + 3개 소스 검색)
  footage-result-card.tsx     # 자료화면 이미지/영상 카드 (다운로드/URL 복사)
  channel-detail-dialog.tsx   # 채널 상세 정보 다이얼로그 (통계, 차트, 최근 영상)
  report-card.tsx             # 분석 리포트 카드 컴포넌트
  batch-process-bar.tsx       # 단일 배치 작업 진행 표시 (BatchJob 기반)
  batch-process-stack.tsx     # 다중 배치 작업 스택 컨테이너
  upgrade-button.tsx          # PRO 결제 버튼 (Portone V2 SDK)
  ui/                         # Shadcn/UI primitives (button, dialog, tabs, badge 등)

lib/
  youtube.ts                  # YouTube API 검색 로직 + 심화 지표 계산
  downloader.ts               # yt-dlp wrapper (progress tracking + streamVideo)
  ai.ts                       # Gemini API 분석 로직 (단일/배치/맥락 분석)
  subtitles.ts                # yt-dlp 자막 추출 로직 (JSON3 포맷)
  footage-search.ts           # 자료화면 검색 로직 (Gemini 키워드 추출 + Unsplash/Pexels/Google)
  storage.ts                  # Supabase 기반 데이터 저장 (채널, 분석 결과)
  supabase.ts                 # Supabase 브라우저 클라이언트 팩토리 (Client Component용)
  supabase-server.ts          # Supabase 서버 클라이언트 팩토리 (API Route/Server Component용)
  quota.ts                    # FREE/PRO 등급별 사용량 제한 로직
  types.ts                    # 공유 인터페이스 (BatchJob 등)
  utils.ts                    # Tailwind utility (cn)

store/
  search-context.tsx          # Global state (영상 검색 상태 - 검색어, 필터, 영상 결과)
  channel-search-context.tsx  # Global state (채널 검색 상태 - 채널 검색, 선택된 채널, 비디오 결과)

supabase-schema.md            # Supabase 테이블 스키마 DDL (profiles, saved_channels, analysis_results)

Dockerfile                    # 3단계 멀티스테이지 빌드 (deps → builder → runner)
.dockerignore                 # Docker 빌드 제외 파일
.github/workflows/deploy.yml  # GitHub Actions CI/CD (Docker Hub → Vultr VPS)
```

### Page Component Architecture

Next.js App Router에서 `'use client'` 페이지는 `export const dynamic`이 무시됩니다.
이를 해결하기 위해 Server Component 래퍼 + Client Component 분리 패턴을 사용합니다.

```
app/page.tsx         → Server Component (export const dynamic = 'force-dynamic')
app/home-content.tsx → Client Component ('use client', 실제 UI 로직)

app/login/page.tsx       → Server Component (export const dynamic = 'force-dynamic')
app/login/login-form.tsx → Client Component ('use client', 로그인 폼)
```

### Core Data Flow

1. **Authentication Flow**
   - `middleware.ts`가 모든 요청에서 Supabase 세션 갱신
   - 미인증 사용자 → `/login`으로 리다이렉트 (`/login`, `/api/auth` 경로 제외)
   - 로그인 성공 → `/`로 리다이렉트
   - API Routes: `supabase.auth.getUser()`로 인증 체크, 미인증 시 401

2. **YouTube Search Flow**
   - User inputs query → `app/home-content.tsx` (Search tab)
   - State managed by `SearchContext` (store/search-context.tsx)
   - API call to `/api/search` → `lib/youtube.ts`
   - `searchVideos()` fetches video IDs, video details, channel details in parallel
   - Returns `EnrichedVideo[]` with calculated metrics (engagementRate, performanceRatio)

3. **Video Download Flow** (YouTube, TikTok & Reddit)
   - User clicks Download → `DownloadDialog` opens or uses Downloads tab
   - GET to `/api/download?url=...&format=mp4|mp3` (SSE stream)
   - Server spawns `yt-dlp` process via `lib/downloader.ts`
   - **Platform Detection**: URL 패턴으로 YouTube/TikTok/Reddit 자동 감지
   - SSE events: `starting`, `title`, `progress`, `destination`, `completed`, `error`
   - **Download Path**: `~/Downloads` (시스템 다운로드 폴더)

4. **AI Analysis Flow**
   - POST to `/api/analyze` → 인증 체크 → Quota 체크(`checkAndIncrementQuota`) → Gemini 분석
   - `lib/ai.ts` calls Gemini API with structured prompt (한국어)
   - **분석 타입**: 단일 영상 / 배치 분석 / 맥락 분석(PRO 전용)
   - 분석 결과: Supabase `analysis_results` 테이블에 저장 가능

5. **Channel Management Flow**
   - 인증된 사용자별 채널 관리 (RLS 정책)
   - `lib/storage.ts`의 Supabase 쿼리로 CRUD
   - `user_id` 기반으로 데이터 격리

6. **Payment Flow** (PRO 업그레이드)
   - `UpgradeButton` → Portone V2 SDK로 결제창 호출 (간편결제)
   - 결제 완료 → POST `/api/payment/confirm`
   - 서버: Portone API로 결제 상태 검증 (`PAID` 확인)
   - 검증 성공 → `profiles.subscription_tier`를 `'PRO'`로 업데이트

7. **Quota System**
   - `lib/quota.ts`에서 FREE/PRO 등급별 제한 관리
   - FREE: 일일 분석 5회, bulk/context 분석 불가, 검색 최대 20개
   - PRO: 일일 분석 500회, bulk/context 분석 가능, 검색 최대 500개
   - UTC 날짜 기준 일일 카운트 자동 리셋

## API Integration

### Environment Variables

Required in `.env.local`:
```bash
# YouTube & AI
YOUTUBE_API_KEY=your-youtube-api-key
GEMINI_API_KEY=your-gemini-api-key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Portone V2 결제
PORTONE_API_SECRET=your-portone-api-secret
NEXT_PUBLIC_PORTONE_STORE_ID=your-portone-store-id
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=your-portone-channel-key

# Footage Search APIs
UNSPLASH_ACCESS_KEY=your-unsplash-access-key
PEXELS_API_KEY=your-pexels-api-key
GOOGLE_CSE_ID=your-google-custom-search-engine-id
GOOGLE_CSE_API_KEY=your-google-api-key
```

### Supabase Schema

3개 테이블 (`supabase-schema.md` 참조):
- **profiles**: `id(UUID)`, `email`, `subscription_tier(FREE/PRO)`, `daily_analysis_count`, `last_analysis_reset`
  - 회원가입 시 트리거(`on_auth_user_created`)로 자동 생성
- **saved_channels**: `user_id`, `channel_id`, `channel_title`, `thumbnail`, `category`
  - Unique constraint: `(user_id, channel_id)`
- **analysis_results**: `user_id`, `type(single/context)`, `video_id`, `title`, `metrics(JSONB)`, `analysis_data(JSONB)`
  - Unique constraint: `(user_id, video_id)`

모든 테이블에 RLS 정책 적용 (`auth.uid() = user_id`).

### Supabase Client Pattern

- **브라우저(Client Component)**: `lib/supabase.ts` → `createBrowserClient()` 사용
- **서버(API Route/Server Component)**: `lib/supabase-server.ts` → `createServerClient()` + `cookies()` 사용
- **Middleware**: `middleware.ts` → 직접 `createServerClient()` + `request.cookies` 사용

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

### Gemini API Usage

- Model: `gemini-3-flash-preview` (lib/ai.ts)
- Prompt: 한국어로 작성된 분석 (Hook, Structure, Target, Insights)
- **자막 통합**: 자막이 있으면 프롬프트에 포함하여 더 정확한 분석 (최대 50,000자)
- Response: JSON 형식 (sometimes wrapped in \`\`\`json, extracted via regex)

### yt-dlp Integration

- macOS: `brew install yt-dlp`, Docker: 바이너리 직접 다운로드
- Spawned as child process in `lib/downloader.ts` and `lib/subtitles.ts`
- `streamVideo()`: 서버 디스크 부하 방지를 위한 스트리밍 다운로드 함수 (향후 활성화 예정)

## Deployment & CI/CD

### Docker

3단계 멀티스테이지 빌드 (`Dockerfile`):
1. **deps**: `node:20-slim`, `npm ci`
2. **builder**: `NEXT_PUBLIC_*` ARG 주입 → `npm run build` (standalone output)
3. **runner**: `python3`, `ffmpeg`, `yt-dlp` 설치, `nextjs` 비특권 사용자, 포트 3000

`next.config.ts`에 `output: 'standalone'` 설정으로 Docker 이미지 크기 최적화.

### GitHub Actions

`.github/workflows/deploy.yml`:
1. `main` 브랜치 push 시 트리거
2. Docker 이미지 빌드 → Docker Hub 푸시
3. SSH로 Vultr VPS 접속 → 최신 컨테이너 실행

필요한 GitHub Secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `VPS_HOST`, `VPS_USER`, `SSH_PRIVATE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `YOUTUBE_API_KEY`, `GEMINI_API_KEY`

## Shadcn/UI Configuration

- Style: `new-york`
- Base color: `neutral`
- CSS variables enabled
- Components installed: Avatar, Badge, Button, Card, Dialog, Input, Label, Progress, ScrollArea, Select, Separator, Skeleton, Slot, Tabs
- Import path: `@/components/ui/*`

## Key Dependencies

### Core
- **Next.js 16**: App Router, React Compiler, standalone output
- **React 19**: UI
- **TypeScript 5**: 타입 시스템
- **Tailwind CSS 4**: 스타일링 (PostCSS 기반)

### Backend & Auth
- **@supabase/ssr**: Supabase SSR 클라이언트 (쿠키 기반 세션)
- **@supabase/supabase-js**: Supabase JavaScript 클라이언트

### Payment
- **@portone/browser-sdk**: Portone V2 브라우저 결제 SDK

### External APIs
- **googleapis**: YouTube Data API v3
- **@google/generative-ai**: Google Gemini API
- **youtube-dl-exec**: yt-dlp Node.js wrapper

### UI & Visualization
- **lucide-react**: 아이콘
- **recharts**: 차트 (채널 조회수 추이)
- **@radix-ui/***: Headless UI (Shadcn/UI 기반)
- **jspdf** + **jspdf-autotable** + **html2pdf.js**: PDF 출력

### Utilities
- **clsx** + **tailwind-merge**: className 조합
- **class-variance-authority**: Variant 스타일링
- **uuid**: 고유 ID 생성

## State Management

### Global State (React Context + sessionStorage)

- **SearchContext** (store/search-context.tsx) - 영상 검색 상태
  - 저장 키: `tubesource-search-state`
  - 상태: query, filters, allVideos, videos, sortBy, timePeriod, hasSearched
  - 기능: sessionStorage에 자동 저장 (300ms 디바운스), 탭 전환 시 상태 유지

- **ChannelSearchContext** (store/channel-search-context.tsx) - 채널 검색 상태
  - 저장 키: `tubesource-channel-search-state`
  - 상태: channelQuery, foundChannels, selectedChannel, videoQuery, filters, allVideos, videos, sortBy, timePeriod

### 상태 유지 패턴
- **하이드레이션**: `isHydrated` 플래그로 SSR/CSR 불일치 방지
- **최적화**: 큰 데이터(subtitleText, description) 제거/축소하여 4MB 제한 준수
- **디바운스**: 300ms 디바운스로 과도한 저장 방지

## Known Patterns and Conventions

- **API Routes**: POST로 body를 받아 처리, GET으로 단순 조회, 인증 필수 (Supabase Auth)
- **Error Handling**: console.error + throw (API routes에서 Next.js가 자동으로 500 응답)
- **File Naming**: kebab-case for files, PascalCase for React components
- **Import Alias**: `@/` = project root (configured in tsconfig.json)
- **Page Pattern**: Server Component 래퍼(dynamic export) + Client Component 분리

## Lessons Learned

- `yt-dlp` 출력 파싱 시 `--newline` 플래그가 필수 (줄바꿈 보장)
- Gemini API 응답은 항상 JSON으로 오지 않으므로 regex fallback 필요
- **다운로드 경로**: 시스템의 "다운로드" 폴더(`~/Downloads`) 사용

### Next.js App Router 주의사항
- `'use client'` 컴포넌트에서 `export const dynamic = 'force-dynamic'`은 **무시됨**
  - Server Component에서만 route segment config가 동작함
  - 해결: Server Component 래퍼 파일에서 `dynamic` export, Client Component는 별도 파일로 분리
- `NEXT_PUBLIC_*` 환경변수는 **빌드 시점**에 인라인되므로 Docker ARG로 전달 필수

### Tailwind CSS 4 색상 문제
- Tailwind CSS 4에서 `bg-red-600` 같은 기본 색상 클래스가 작동하지 않을 수 있음
- **해결책**: Button 컴포넌트에 인라인 스타일로 색상 variant 구현
  - `components/ui/button.tsx`에서 `colorStyles` 객체로 색상 정의

### yt-dlp 파일명 템플릿
- **올바른 문법**: `%(title)s.%(ext)s` (중괄호 없이)
- **잘못된 문법**: `%({title})s.%({ext})s` → `NA.NA` 파일 생성됨
- `cleanVideoUrl()` 함수로 URL 정규화 및 플랫폼별 처리

### YouTube API 최적화
- **50개 제한**: 모든 API에서 chunking/pagination 필수
- **중복 제거**: `Set`으로 videoIds 중복 제거
- **할당량 관리**: search.list가 100 units로 가장 비쌈

### Storage 마이그레이션 (Local JSON → Supabase)
- 기존 `data/channels.json` 파일 기반 → Supabase `saved_channels` + `analysis_results` 테이블
- 모든 storage 함수에 `userId` 파라미터 필수 (RLS 정책 연동)
- `getClient()` 헬퍼: supabase 인스턴스가 없으면 브라우저 클라이언트 자동 생성

### TikTok/Reddit 다운로드 지원
- URL 패턴 매칭으로 YouTube/TikTok/Reddit 자동 구분
- `--user-agent` 플래그로 Chrome 브라우저 헤더 직접 지정 (호환성 확보)
- H.264(avc1) 코덱 우선 선택 (Adobe Premiere Pro 호환성)

## Future Expansion Points

- 도메인 연결 및 SSL(HTTPS) 적용
- Stripe를 통한 글로벌 결제 확장
- 서버 리소스 모니터링 대시보드
- `streamVideo()` 활성화 (서버 디스크 부하 방지)
- 분석 결과 Supabase 자동 저장 연동 완성
- TikTok 검색 및 분석 기능 추가
- 자료화면 검색 고도화 (AI 관련성 순위, 일괄 다운로드)
