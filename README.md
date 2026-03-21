# PokoParty

포켓몬 스토리 공략용 파티 빌더. 추천 엔진, 파티 분석, 도감 기능을 제공합니다.

## 주요 기능

- **파티 추천** -- 스코어링 엔진 기반으로 스토리 진행 시점에 맞는 최적 파티를 추천
- **파티 분석** -- 타입 커버리지, 약점 분석, 종족값 비교 등 파티 밸런스 진단
- **포켓몬 도감** -- 포켓몬 상세 정보 열람
- **파티 저장** -- 로그인 후 파티를 저장하고 관리 (Supabase Auth)

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16.2, React 19 |
| 언어 | TypeScript 5 |
| 스타일링 | Tailwind CSS 4 |
| 백엔드/인증 | Supabase (Auth, Database, RLS) |
| 차트 | recharts |
| 테스트 | Vitest, Testing Library, jsdom |
| 린트 | ESLint |

## 시작하기

### 사전 준비

- Node.js 18 이상
- Supabase 프로젝트 (URL + Anon Key)

### 설치

```bash
npm install
cp .env.example .env.local
```

`.env.local`에 아래 환경변수를 설정합니다:

| 변수 | 필수 | 설명 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | O | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | O | Supabase 익명 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | | 서버 사이드 관리용 키 |

### 개발 서버

```bash
npm run dev
```

### 빌드

```bash
npm run build
npm start
```

### 테스트

```bash
npm test            # 단일 실행
npm run test:watch  # 감시 모드
```

### 린트

```bash
npm run lint
```

## 스크립트 (npm scripts)

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | Next.js 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 실행 |
| `npm test` | Vitest 테스트 실행 |
| `npm run test:watch` | Vitest 감시 모드 |
