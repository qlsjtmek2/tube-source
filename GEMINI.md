# GEMINI.md

This file provides guidance to Gemini (or Claude Code) when working with code in this repository.

## Project Overview

**Video Source Collector** (또는 TubeSource)는 유튜브 영상 분석 및 다운로드를 제공하는 개인용 콘텐츠 크리에이터 도구에서 발전한 **SaaS(Software as a Service)** 플랫폼입니다.

- **Tech Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Shadcn/UI
- **Database**: Supabase (PostgreSQL) + RLS 보안 적용
- **Auth**: Supabase Auth (Email 로그인)
- **Deployment**: 단일 VPS (Ubuntu 24.04 LTS) + Docker + GitHub Actions CI/CD
- **Payment**: Portone V2 (카카오페이, 네이버페이 등 국내 간편결제 지원)
- **External Services**: YouTube Data API v3, Google Gemini API (gemini-3-flash-preview), yt-dlp

## 🗓 SaaS 전환 여정 (2026.02.13)

1.  **로컬 JSON 탈피**: `data/*.json` 방식에서 Supabase 클라우드 DB로 전면 마이그레이션.
2.  **인증 시스템 도입**: 유저별 데이터 격리를 위한 Supabase Auth 및 Middleware 구축.
3.  **도커라이징**: `yt-dlp`와 `ffmpeg` 의존성을 포함한 Docker 환경 구축 및 빌드 최적화.
4.  **CI/CD 자동화**: `git push` 시 Docker Hub를 거쳐 VPS로 자동 배포되는 파이프라인 구축.
5.  **수익화 기반 마련**: Portone V2 연동 및 유저 등급(FREE/PRO)별 API Quota 시스템 구현.

## Architecture Overview

### Data Flow & Storage
- **Profiles**: 유저 구독 등급 및 일일 분석 사용량 관리.
- **Saved Channels**: `user_id` 기반 RLS 정책으로 유저별 관심 채널 격리 저장.
- **Analysis Results**: AI 분석 리포트 및 지표 저장 (JSONB 포맷 활용).

### CI/CD Pipeline
1.  **Local (Mac)**: 개발 및 `git push`.
2.  **GitHub Actions**: 
    - `NEXT_PUBLIC_*` 환경 변수 주입 및 Docker 이미지 빌드.
    - Docker Hub 푸시.
    - SSH를 통해 VPS 접속 및 최신 컨테이너 실행.
3.  **VPS (Server)**: Docker 컨테이너 상에서 3000번 포트로 서비스 구동.

## Important Implementation Details

- **Standalone Build**: `next.config.ts`의 `output: 'standalone'` 설정으로 Docker 이미지 용량 최적화.
- **Quota Management**: `lib/quota.ts`를 통해 일일 분석 횟수 제한 및 자정(UTC) 기준 자동 리셋.
- **Payment Verification**: 서버사이드에서 Portone API를 직접 호출하여 결제 내역 위변조 검증 후 등급 상향.
- **Streaming Download**: (향후 과제) 서버 디스크 부하 방지를 위해 표준 출력을 통한 스트리밍 다운로드 기초 함수(`streamVideo`) 마련.

## Future Expansion Points

- 도메인 연결 및 SSL(HTTPS) 적용.
- Stripe를 통한 글로벌 결제 확장.
- 서버 리소스 모니터링 대시보드.