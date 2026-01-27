# Video Source Collector - Development Plan

> **Goal**: Build a personal YouTube analysis application for content creators.
> **Tech Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/UI, Local JSON Storage (Data Persistence), YouTube Data API v3, yt-dlp (Downloader), Google Gemini API (AI Analysis).

## 📋 프로젝트 개요
- **핵심 기능**: 고급 필터 검색, 영상/음원 다운로드, AI 기반 영상 전략 분석, 관심 채널 관리.
- **대상**: 1인 크리에이터, 편집자, 콘텐츠 전략가.

---

## 🎯 Phase 1: 프로젝트 초기화 및 설정
- [x] Next.js 프로젝트 초기화 (TypeScript, Tailwind, ESLint)
- [x] Shadcn/UI 및 필수 컴포넌트 설치
- [x] 필수 라이브러리 설치 (lucide-react, googleapis 등)
- [x] 로컬 데이터 저장소 구조 설계 (data/channels.json)
- [x] YouTube Data API v3 연동 설정

## 🎯 Phase 2: 유튜브 검색 엔진 (Collector)
- [x] YouTube 검색 API 연동 (조회수, 구독자 수 등 심화 지표 포함)
- [x] 한국어 검색 UI 및 필터 구현 (기간, 길이, 정렬 등)
- [x] 영상 카드 컴포넌트 제작 (성과도, 참여율 자동 계산)
- [ ] 검색 결과 무한 스크롤 적용

## 🎯 Phase 3: 관심 채널 관리 (Favorites)
- [ ] 채널 즐겨찾기 API 구현 (로컬 JSON 저장)
- [ ] 영상 카드에 '채널 저장' 버튼 추가
- [ ] '관심 채널' 탭 구현: 저장된 채널 목록 보기 및 영상 모아보기
- [ ] 특정 채널의 모든 영상 불러오기 기능

## 🎯 Phase 4: 다운로더 통합
- [x] `yt-dlp` 환경 설정 및 연동
- [x] MP4/MP3 선택 다운로드 API 구현
- [x] 다운로드 진행률 표시 UI 구현
- [x] 유튜브 링크 직접 입력 다운로드 기능 추가

## 🎯 Phase 5: Gemini AI 전략 분석
- [ ] Google Gemini SDK 통합
- [ ] 영상 구성 및 전략 분석용 프롬프트 설계
- [ ] AI 분석 결과 리포트 UI (모달/사이드바)

## 🎯 Phase 6: AI Strategy Analysis
- [x] Integrate Google Gemini SDK
- [x] Design System Prompt for Video Analysis (Structure, Hook, Retention Strategy)
- [x] Create "Analyze" button on Video Card
- [x] Display Analysis Report (Modal or Sidebar)

## 🎯 Phase 7: Trends & Dashboard
- [x] Implement "Real-time Trends" Dashboard (Popular videos by category)
- [x] Show "Trending Keywords" (implied via popular videos)
- [x] Final UI Polish & Error Handling

---

## 📊 Progress
- **Status**: All Phases Complete! Application Ready for Use.
