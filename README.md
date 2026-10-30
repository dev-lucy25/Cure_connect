# NursePass

간호학생의 임상실습 1,000시간을 기록하고, 실습 메모를 AI로 SOAPIE 케이스스터디로 정리하고, 지도교수가 학생 이수 현황을 한눈에 관리하는 웹앱입니다.

- 배포 주소: https://nursepass-coral.vercel.app
- 체험: 로그인 화면의 **학생으로 체험 / 교수로 체험** 버튼으로 가입 없이 바로 둘러볼 수 있습니다. 시드로 만든 가짜 계정이며 실제 사람 정보가 아닙니다.

## 프로젝트 개요
- 한 줄 소개: 간호교육인증평가 기준인 임상실습 1,000시간을 기록하고, 실습 메모를 AI로 SOAPIE·NANDA 케이스로 정리하는 간호학생·교수용 실습 관리 앱
- 누구를 위한 앱인가: 임상실습 중인 간호학과 3·4학년 학생, 그리고 학생들의 실습 시간·과제를 확인하는 실습 지도교수·조교
- 어떤 상황에서 쓰는가
  - 학생: 하루 실습이 끝난 뒤 실습 시간을 기록하고, 병동에서 적은 환자 메모를 케이스스터디 과제로 정리할 때. 처음 가는 병동을 준비하거나 선배의 병동 팁(족보)을 찾아볼 때
  - 교수: 학생별 1,000시간 진행률과 미달 위험군을 확인하고, 실습 시간 인증과 케이스 과제 채점을 할 때. 인증평가용 실습대장을 내보낼 때

## 주요 기능
| 과제의 꼭 있어야 하는 기능 | 화면(프론트엔드) | API(백엔드) |
| --- | --- | --- |
| 1. 회원가입·로그인 (학생/교수 역할, 이메일 인증 코드, 비밀번호 재설정) | `app/login`, `app/verify`, `app/reset-password` | `server/auth-actions.ts`, `server/verify-actions.ts`, `server/password-actions.ts`, `app/auth/callback/route.ts` (Supabase Auth) |
| 2. 실습 1,000시간 기록·관리 (과목별 이수 현황, 빠른 기록, 일정 D-Day, 준비물 체크리스트) | `app/(app)/page.tsx` (학생 홈) | `server/practice-actions.ts`, `server/practice-repo.ts`, `server/checklist-actions.ts` |
| 3. AI 케이스스터디 정리 (메모 → SOAPIE·NANDA 간호진단, AI 도우미와 대화, 교수님께 제출) | `app/(app)/cases`, `app/(app)/cases/[id]`, `app/(app)/submissions` | `server/case-actions.ts`, `server/case-gemini.ts`, `server/case-chat.ts`, `server/submission-actions.ts` |
| 4. 교수 대시보드 (학생 현황판·위험군, 실습 시간 승인, 과제 채점, 실습대장 CSV) | `app/(app)/page.tsx` (교수 홈), `app/(app)/prof/*` | `server/professor-repo.ts`, `server/approval-actions.ts`, `server/grading-actions.ts`, `app/api/prof/export/route.ts` |

더 만든 기능:
- **선배 병동 족보 마켓**: 무료 팁 + 크레딧으로 여는 시크릿 팁, 평점, 익명/닉네임 댓글·답글 (`app/(app)/notes`)
- **크레딧**: 족보 등록 보상, 열람 시 작성자 적립, 충전소(가상 결제, 실제 돈은 오가지 않음)와 크레딧 내역 (`app/(app)/credits`)
- **AI 학습 도구**: AI 프리셉터 모의 구술질문(채점·오답노트), AI 실습일지 초안 (`app/(app)/tools/preceptor`, `app/(app)/tools/journal`)
- **실습 도구**: 수액 gtt 계산기, 연령별 활력징후 정상 범위, 즉시 보고 기준 (`app/(app)/tools`)
- **익명 통계**(교수): 병동별 난이도, 어려운 술기 Top 10, 병동×술기 히트맵. 한 칸에 학생이 5명 미만이면 숨김 (`app/(app)/prof/insights`)
- **방 코드**: 교수가 만든 실습반 코드로 학생과 교수를 연결
- **알림**: 독려 알림, 채점 결과, 족보 댓글
- **프로필 사진**: 동그란 틀에서 자르기·확대 후 업로드
- **개인정보 보호**: 케이스·족보·일지·댓글에 환자 식별 정보(이름·등록번호 등)가 있으면 저장 전에 경고
- 모바일 우선 반응형 디자인, 다크 모드, 화면 전환 모션과 로딩 스켈레톤

## 기술 스택
- 프론트엔드: Next.js 16 (App Router, React 19, TypeScript), Tailwind CSS 4, Motion(애니메이션), Base UI, Pretendard 글꼴
- 백엔드: Next.js 서버 액션·Route Handler, Zod(입력 검증), Prisma 7, Supabase Auth(로그인·이메일 인증), Google Gemini API(`gemini-3.6-flash`, 케이스 정리·AI 도우미·채점 참고안·모의질문 평가·일지 초안)
- 데이터(어디에, 무엇을): Supabase PostgreSQL(서울 리전)에 Prisma로 저장 — 사용자 프로필·학교·방 코드, 실습 시간 기록·일정·체크리스트, 케이스 메모와 AI 정리 결과·대화, 과제 제출·채점, 족보·평점·댓글, 크레딧 내역·결제 기록, 알림, 프로필 사진
- 배포: Vercel (서울 리전 함수), `main`에 머지하면 GitHub Actions로 자동 배포

## 실행 방법
준비물: Node.js 24, npm, Supabase 프로젝트, Gemini API 키

1. 저장소를 내려받고 패키지를 설치합니다.
   ```bash
   npm ci
   ```
2. `.env.example`을 복사해 `.env`를 만들고 값을 채웁니다. Supabase URL·anon key, DB 주소(`DATABASE_URL` 6543 포트, `DIRECT_URL` 5432 포트), `GEMINI_API_KEY` 등이 필요합니다. `.env`는 git에 올리지 않습니다.
3. DB 테이블을 만들고, 원하면 시연 데이터(체험 계정·케이스·족보·학생 10명)를 넣습니다.
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```
4. 개발 서버를 켜고 브라우저에서 http://localhost:3000 을 엽니다.
   ```bash
   npm run dev
   ```

배포 주소: https://nursepass-coral.vercel.app

## AI 활용 내역
- 사용한 도구
  - 개발: Claude Code (Claude Opus 5.5) — 설계 문서 작성, 기능 구현, 버그 찾기, 디자인 개편
  - 앱 안의 AI 기능: Google Gemini API
- 주요 프롬프트(그대로 붙여 넣기):
  - (팀이 채움)
- AI가 만든 것 / 사람이 고친 것
  - AI가 만든 것: (팀이 채움)
  - 사람이 고친 것: (팀이 채움)
- 결과를 확인한 방법
  - 기능마다 실제 브라우저에서 학생·교수 계정으로 동작을 확인한 뒤 커밋
  - 타입 검사(`tsc`), 린트(`npm run lint`), 배포 환경에서 로그인·DB·AI 정리 재확인
  - 설계 문서([docs/REDESIGN.md](docs/REDESIGN.md))에 사용자 흐름 점검 결과와 수정 내역을 기록

## 팀원 역할
- 기획: 202645079 박경민
- 프론트엔드: 202632991 이민제
- 백엔드: 202634772 김정희
- 검증: 202630943 이지현

## 아쉬운 점과 다음에 할 일
- 결제는 가상 결제입니다. 다음에는 토스페이먼츠를 실제로 연동할 계획입니다.
- 인증 메일을 개인 Gmail로 보내서 스팸함에 들어갈 수 있습니다. 자체 도메인과 전용 메일 발송 서비스로 바꿀 계획입니다.
- Gemini 무료 등급은 하루 사용 횟수가 적어서, 사용자가 많으면 AI 기능이 잠시 멈춥니다.
- 활력징후 정상 범위와 보고 기준은 참고용입니다. 교재·학교 기준과 대조해 확정해야 합니다.
- 크레딧 계산, 위험군 판정, gtt 계산 같은 핵심 로직에 단위 테스트를 더할 계획입니다.
