# Video Source Collector (TubeSource)

유튜브, TikTok 및 레딧 영상 분석 및 다운로드를 위한 **올인원 크리에이터 SaaS 플랫폼**입니다. 이제 클라우드 환경에서 어디서나 본인의 분석 기록을 관리하고 구독 기반의 고급 기능을 사용할 수 있습니다.

## ✨ 주요 기능

### 1. AI 전략 분석
- **심층 분석 (Deep Analysis)**: Gemini AI를 사용하여 영상의 후킹 문구, 구성 전략, 타겟 시청자 및 커뮤니티 니즈를 분석합니다.
- **맥락 분석 (Context Analysis)**: 여러 개의 영상을 선택하여 공통된 성공 요인과 시장 트렌드를 도출하는 종합 리포트를 생성합니다 (PRO 전용).

### 2. 영상 다운로드
- **다중 플랫폼 지원**: **YouTube**, **TikTok**, **레딧(Reddit)** 영상 링크를 지원합니다.
- **실시간 스트리밍**: 서버 부하를 최소화하는 고속 다운로드 환경을 제공합니다.

### 3. SaaS 시스템
- **사용자 인증**: Supabase Auth 기반의 안전한 로그인 및 유저별 데이터 격리.
- **구독 및 결제**: Portone 연동으로 카카오페이, 네이버페이 등 국내 결제 지원.
- **사용량 관리**: 등급별 일일 분석 횟수 제한(Quota) 시스템.

## 🚀 빠른 시작 (배포 가이드)

본 프로젝트는 **Docker**와 **GitHub Actions**를 통한 자동 배포에 최적화되어 있습니다.

### 1. 필수 환경 변수 설정 (GitHub Secrets)
GitHub 레포지토리 설정에서 다음 비밀값을 등록하세요:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `YOUTUBE_API_KEY`, `GEMINI_API_KEY`
- `PORTONE_API_SECRET`, `NEXT_PUBLIC_PORTONE_STORE_ID`, `NEXT_PUBLIC_PORTONE_CHANNEL_KEY`
- `VPS_HOST`, `VPS_USER`, `SSH_PRIVATE_KEY`
- `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`

### 2. 자동 배포
`main` 브랜치에 코드를 푸시하면 GitHub Actions가 자동으로 빌드 및 VPS 배포를 수행합니다.
```bash
git push origin main
```

### 3. 로컬 개발 환경
```bash
cp .env.example .env.local
npm install
npm run dev
```

## 🛠 Tech Stack
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Shadcn/UI
- **Backend**: Supabase (DB/Auth), Portone (Payment)
- **Infra**: Ubuntu VPS, Docker, GitHub Actions
- **Tools**: yt-dlp, ffmpeg, Google Gemini AI
