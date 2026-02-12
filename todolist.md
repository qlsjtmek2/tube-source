# 🚀 Video Source Collector: SaaS 로드맵 (VPS + GitHub Actions)

## 🗓 Phase 1: 데이터베이스 및 인증 기반 구축 (Supabase)
로컬 파일 의존성을 제거하고 클라우드 DB로 전환합니다.
- [ ] **Supabase 스키마 설계**
    - [ ] `profiles`: 유저 등급(FREE, PRO), API 사용량, 유저 정보
    - [ ] `saved_channels`: 유저별 관심 채널 (RLS 적용)
    - [ ] `analysis_results`: 유저별 분석 기록 및 AI 리포트 (RLS 적용)
- [ ] **저장소 로직 리팩토링 (`lib/storage.ts`)**
    - [ ] `fs` 기반 로컬 저장 로직 제거
    - [ ] Supabase Client 연동 (조회/저장/삭제)
- [ ] **사용자 인증 통합**
    - [ ] Supabase Auth 설정 및 로그인 UI 구축
    - [ ] Middleware를 통한 유저 세션 관리 및 페이지 보호

## 🐳 Phase 2: 도커라이징 및 VPS 환경 구축
어느 환경에서나 동일하게 작동하는 서버 환경을 만듭니다.
- [ ] **Dockerfile 작성**
    - [ ] Node.js 20+ 및 yt-dlp, ffmpeg 설치 자동화
- [ ] **Next.js 출력 최적화**
    - [ ] `output: 'standalone'` 설정 (도커 빌드 최적화)
- [ ] **스트리밍 다운로드 구현**
    - [ ] 서버 디스크를 거치지 않고 브라우저로 직접 파이핑(Piping) 하도록 다운로드 API 수정

## 🤖 Phase 3: GitHub Actions 자동 배포 (CI/CD)
- [ ] **GitHub Actions 워크플로우(`deploy.yml`) 작성**
    - [ ] 코드 푸시 시 Docker 이미지 빌드 및 Docker Hub/GitHub Registry 푸시
    - [ ] SSH를 통해 VPS 접속 후 최신 이미지로 컨테이너 재시작
- [ ] **인프라 보안 설정**
    - [ ] GitHub Secrets에 배포용 비밀키(VPS IP, SSH Key, API Keys) 등록
    - [ ] Nginx Reverse Proxy 및 HTTPS(Let's Encrypt) 설정

## 💰 Phase 4: 수익화 기능 및 고도화
- [ ] **구독 등급별 사용량 제한 (Quota)**
    - [ ] FREE/PRO 등급별 API 호출 횟수 제한 로직 추가
- [ ] **Stripe 결제 시스템 연동**
    - [ ] 결제 완료 시 유저 등급 자동 업데이트
- [ ] **배포 및 최종 검증**
    - [ ] 전체 파이프라인 테스트 및 상용 배포
