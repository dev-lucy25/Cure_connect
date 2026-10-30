# NursePass

간호학과 학생의 임상실습 기록과 학습을 돕는 웹 앱입니다. 학생은 실습 시간과 일정을 관리하고, 케이스와 학습 기록을 정리할 수 있습니다. 교수자는 학생의 진행 상황을 확인하고 과제를 관리할 수 있습니다.

## 주요 기능

- **실습 시간 관리** — 누적 실습 시간, 목표 달성률, 과목별 기록, 다음 실습 일정과 D-day를 관리합니다.
- **체크리스트** — 실습 준비물과 수행 항목을 확인하고 관리합니다.
- **AI 케이스 정리** — 케이스 메모를 바탕으로 SOAPIE 초안과 간호 학습 자료를 작성하고 다듬습니다.
- **AI 학습 도구** — 프리셉터 모의 질문으로 답변을 연습하고, AI 실습일지 초안을 작성합니다.
- **선배 병동 족보** — 병동별 실습 정보와 팁을 검색·열람하고 댓글과 답글로 경험을 나눕니다.
- **교수자 대시보드** — 학생의 실습 현황, 과제 제출 및 채점을 확인합니다.
- **프로필 및 알림** — 프로필을 관리하고 실습·과제·족보 관련 알림을 확인합니다.
- **실습 도구** — 로그인 없이 수액 주입 속도 계산기와 활력징후 기준표를 사용할 수 있습니다.

> AI가 생성한 내용은 학습을 위한 초안입니다. 임상 판단이나 학교·병원 지침을 대신하지 않으므로 반드시 검토해 사용하세요.

## 기술 스택

- Next.js 16 · React 19 · TypeScript
- Tailwind CSS 4
- Supabase Auth
- PostgreSQL · Prisma 7
- Google Gemini API

## 시작하기

### 준비 사항

- Node.js와 npm
- Supabase 프로젝트와 PostgreSQL 데이터베이스
- AI 기능을 사용할 경우 Google Gemini API 키

### 설치 및 환경 변수

```bash
npm install
Copy-Item .env.example .env
```

`.env`에 아래 값을 설정합니다. 실제 키와 연결 문자열은 저장소에 커밋하지 마세요.

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저에서 사용하는 Supabase 공개 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 시드 데이터 생성에 사용하는 서버 전용 키 |
| `SEED_USER_PASSWORD` | 시드 테스트 계정의 공통 비밀번호 |
| `DATABASE_URL` | 앱의 PostgreSQL 연결 문자열 (Transaction pooler 권장) |
| `DIRECT_URL` | Prisma 마이그레이션용 PostgreSQL 연결 문자열 (직접 연결 또는 Session pooler) |
| `GEMINI_API_KEY` | AI 기능용 Google Gemini API 키 |
| `DEMO_LOGIN_ENABLED` | 시연용 빠른 로그인 버튼 활성화 여부 (`true` 또는 `false`) |

### 데이터베이스와 실행

```bash
npm run db:migrate
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

선택적으로 시연 계정과 예시 데이터를 생성할 수 있습니다. `SUPABASE_SERVICE_ROLE_KEY`, `DIRECT_URL`, `SEED_USER_PASSWORD`를 먼저 설정하세요.

```bash
npm run db:seed
```

## 사용 가능한 명령

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 검사 |
| `npm run db:generate` | Prisma 클라이언트 생성 |
| `npm run db:migrate` | 데이터베이스 마이그레이션 |
| `npm run db:seed` | 시연용 계정과 예시 데이터 생성 |

## 프로젝트 구조

```text
app/          페이지와 라우트 핸들러
components/   화면 및 UI 컴포넌트
lib/          공통 유틸리티와 검증 로직
server/       서버 액션 및 데이터 접근
prisma/       데이터 모델, 마이그레이션, 시드 데이터
```
