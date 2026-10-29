# NursePass 대규모 개선 설계서

- 작성일: 2026-10-29
- 기준 자료: https://sites.google.com/view/nursepass-1000-ai/full-page-embed (임베드된 단일 HTML 데모 전체 소스 분석)
- 범위: **기능·데이터·서버 설계**. 디자인(색·레이아웃)은 이번 범위에서 제외.
- 현재 코드 기준: Next.js 16.4.3(App Router, `cacheComponents`), Supabase Auth, Prisma 7 + Postgres, Gemini(케이스 AI)

> 데모는 모든 데이터가 브라우저 메모리에 하드코딩된 프로토타입이다(새로고침하면 초기화, 결제·AI·로그인 모두 가짜).
> 이 설계는 데모의 **모든 기능을 실제로 동작하는 서버 기능**으로 옮기는 것을 목표로 한다.

---

## 0. 보안 원칙: env / API 키

### 0-1. 현재 상태 점검 결과 (2026-10-29)

| 점검 항목 | 결과 |
|---|---|
| `.env`가 git에 추적되는가 | **아니오** (`git ls-files`에 없음) |
| 과거 커밋 전체(모든 브랜치)에 `.env`가 들어간 적이 있는가 | **없음**. `.env.example`만 있고, 3번의 변경 모두 값이 빈 항목뿐 |
| 원격 `origin/main`, `dev-lucy25/main`, `dev-lucy25/fix/tab-speed` | `.env.example`만 존재 |
| 전체 히스토리 키 패턴 검사 (Google `AIza…`, `sk-…`, JWT, 비밀번호 포함 DB URL) | **검출 0건** |
| `.env.paris.bak` (로컬 백업) | `.env*` 규칙으로 무시됨 |
| `.gitignore` | `.env*`, `*.env` 무시, `!.env.example`만 허용 (`*.env` 줄은 이번에 보강) |

→ **git을 통해 유출된 키는 없음. 메인에서 지울 파일도 없음.**
단, `.env` 내용을 채팅·스크린샷·메신저 등 git 밖으로 공유한 적이 있다면 해당 키(Gemini, Supabase service role, DB 비밀번호)는 재발급해야 한다.

### 0-2. 규칙 (앞으로 계속 적용)

1. `.env`, `.env.local`, `*.env`, `.env.*.bak` 등 **실제 값이 든 파일은 절대 커밋하지 않는다.** 커밋 가능한 것은 값이 빈 `.env.example`뿐.
2. 실제 키 보관 위치: **로컬 `.env`(git 무시)**와 **배포 플랫폼 환경변수(Vercel Project Settings)**, 이 두 곳뿐.
3. 코드에 키를 직접 쓰지 않는다(하드코딩 금지). 키 문자열이 소스에 있으면 그게 곧 유출이다.
4. 비밀 키에는 `NEXT_PUBLIC_` 접두사를 쓰지 않는다. 브라우저 공개값은 Supabase URL·anon key, Toss **클라이언트** 키뿐.
5. `process.env`를 여기저기서 직접 읽지 않는다. `lib/env.ts`(server-only, zod 검증) 한 곳에서만 읽고, 나머지는 거기서 import한다.
   - 키가 없으면 해당 기능만 "설정 필요" 오류를 낸다(현재 `case-gemini.ts`의 `config` 실패 방식 유지).
6. 커밋 전 비밀 검사:
   - GitHub 저장소 Settings → Code security → **Secret scanning + Push protection** 켜기 (`liolo980506/my-web`, `dev-lucy25/my-web` 둘 다)
   - 로컬은 `gitleaks protect --staged`를 pre-commit 훅으로 실행 (선택)
7. 키가 유출된 경우 순서: **① 즉시 키 폐기·재발급 → ② 배포 환경변수 교체 → ③ 히스토리에서 제거**(`git filter-repo`, 강제 푸시는 공용 저장소 규칙상 협의 후). 히스토리를 지워도 이미 복제된 키는 살아 있으므로 ①이 먼저다.

### 0-3. 환경변수 목록 (개선 후)

| 이름 | 공개 여부 | 용도 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 공개 | Supabase 접속 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개 | Supabase 로그인 (RLS로 테이블 직접 접근 차단) |
| `SUPABASE_SERVICE_ROLE_KEY` | **비밀** | 시드·체험 계정 생성 스크립트 전용 |
| `DATABASE_URL` / `DIRECT_URL` | **비밀** | Prisma (앱 6543 / 마이그레이션 5432) |
| `GEMINI_API_KEY` | **비밀** | 케이스 AI |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 공개 | 결제위젯 (신규) |
| `TOSS_SECRET_KEY` | **비밀** | 결제 승인·취소 API (신규) |
| `TOSS_WEBHOOK_SECRET` | **비밀** | 결제 웹훅 검증 (신규) |
| `DEMO_LOGIN_ENABLED` / `DEMO_ACCOUNT_PASSWORD` | **비밀** | 체험 로그인 (신규, 운영에서는 끌 수 있음) |
| `SEED_USER_PASSWORD` | **비밀** | 시드 계정 공통 비밀번호 |

---

## 1. 데모 기능 전수 목록 (빠짐없이)

표기: **현재** = 이 저장소에 이미 있음 / **일부** = 비슷한 것이 있으나 데모와 다름 / **없음** = 새로 만들어야 함.
WIP = `feat/ward-notes` 브랜치의 커밋 안 된 작업(족보·크레딧).

### A. 공통 화면 틀

| ID | 기능 | 데모 동작 | 현재 |
|---|---|---|---|
| A1 | 상단 헤더 | 로고 `N+`, 서비스명 NursePass, "DIT 해커톤 데모" 배지, 슬로건. 로고 클릭 → 학생 홈 | 일부 (탭바 구조) |
| A2 | 역할 전환 바 | `🔐 로그인 화면` / `👩‍⚕️ 학생 뷰` / `👨‍🏫 교수 뷰` 즉시 전환 (심사용) | 없음 → **체험 모드 전용**으로 구현 (A2 설계 참고) |
| A3 | 헤더 크레딧 배지 | `💎 1,200 C +충전`, 누르면 충전소 모달 | 없음 |
| A4 | 토스트 알림 | 화면 오른쪽 아래, 기본/주의(amber)/오류(rose) 3종, 2.8초 뒤 사라짐 | 일부 (`form-status`) |
| A5 | 푸터 | 서비스명·출품 설명, 기능 요약 한 줄 | 없음 |
| A6 | 모달 | 크레딧 충전소, 족보 등록 (X·닫기·취소) | 없음 |

### B. 로그인 / 회원가입 / 계정

| ID | 기능 | 데모 동작 | 현재 |
|---|---|---|---|
| B1 | 로그인 화면 소개 영역 | "간호교육인증평가 1,000시간 완벽 대응", 헤드카피, 3가지 특징(1,000시간 자동 계산·D-Day / 메모→SOAPIE·NANDA / 족보 C2C 마켓) | 일부 (`guest-home`) |
| B2 | 원클릭 체험 로그인 | `간호학생 로그인 체험` / `지도교수 로그인 체험` 버튼 → 즉시 해당 역할 화면 + 환영 토스트 | 없음 |
| B3 | 소속 학교/기관 선택 | 동의과학대 간호학과(DIT) / 부산대 간호대학 / 인제대 간호대학 | 없음 |
| B4 | 학번·교번(ID) 입력 | 학번 또는 교번으로 로그인 | 없음 (이메일 로그인) |
| B5 | 비밀번호 | | 현재 |
| B6 | 역할 선택 | `간호학과 학생` / `실습 지도교수 / 조교` 라디오 | 없음 (가입 시 학생 고정, 교수는 시드로만) |
| B7 | 로그인 후 이동 | 역할별 홈으로 이동 + "OOO 계정으로 로그인되었습니다" 토스트 | 일부 |
| B8 | 회원가입 | (데모엔 화면 없음. 실제 서비스엔 필수) | 현재 (이름·이메일·비밀번호, 이메일 인증) → 학교·학번·학년반 추가 |
| B9 | 로그아웃 | (데모엔 없음) | 현재 |
| B10 | 비밀번호 재설정 | (데모엔 없음, 실제 서비스엔 필요) | 없음 |

### C. 학생 프로필 배너 · 탭

| ID | 기능 | 데모 동작 | 현재 |
|---|---|---|---|
| C1 | 프로필 배너 | 이름, 학년·반(3학년 B반), 학번, 상태 배지(`실습 정상 이수중`), 학교, 현재 로테이션 과목(성인간호학실습 II) | 없음 |
| C2 | 학생 탭 4개 | `📊 1,000시간 & 일정 홈` / `🤖 AI 케이스스터디 변환기` / `🔒 선배 병동 족보 마켓` / `🧮 수액 gtt 계산기 · 도구` | 일부 (실습·케이스·족보(비활성)) |

### D. 1,000시간 & 일정 홈 (학생 대시보드)

| ID | 기능 | 데모 동작 | 현재 |
|---|---|---|---|
| D1 | 1,000시간 게이지 | 누적 N / 1,000시간, 남은 시간, "약 N일 듀티"(남은 시간 ÷ 8), 달성률 % 배지, 진행 막대 | 일부 (`progress-hero`, 목표 시간 수정 가능) → 남은 듀티일 추가 |
| D2 | 전공 영역별 이수 현황 | 6과목: 성인 320h · 모성 120h · 아동 120h · 지역사회 160h · 정신 160h · 간호관리 120h (합 1,000h). 과목별 현재/목표/%/막대 | **없음** (일지에 과목 필드 없음) |
| D3 | 오늘 실습 빠른 기록 | 과목 선택, 병원·병동·듀티 텍스트, 시간 프리셋 `8시간(1일)` `9시간` `4시간(반일)` `40시간(1주 일괄)`, `+ 시간 누적하기` → 게이지·과목·최근내역·교수 화면 즉시 반영 + 토스트 | 일부 (`log-form`: 날짜·병원·병동·시간·한 일) → 과목·듀티·프리셋·1주 일괄 추가 |
| D4 | 다음 실습 카드 | `📅 다음 실습 D-3`, 기간(11.02~11.13), 병원·병동(진료과), "1주차 Day 근무(07:00~15:00)", 집결 장소·시각(본관 7층 엘리베이터 앞 06:40), 담당 수간호사(현장지도자), 주요 다빈도 질환, 실습 조원·조 번호, 버튼 `🔍 해당 병동 선배 족보 보러가기`(마켓으로) / `🤖 케이스 준비`(케이스로) | 일부 (`schedule-panel`: 병원·병동·시작일, D-day) → 상세 필드 대량 추가 |
| D5 | 첫 출근 준비물 체크리스트 | 6개 기본 항목, 눌러서 완료/해제(취소선), "3 / 6 완료" | **없음** |
| D6 | 최근 실습 시간 인증 내역 | 과목 배지, 병동, 한 일 메모, 날짜, `+8시간`. "지도교수 대시보드와 실시간 연동" | 일부 (`log-section`) → 과목·인증 상태 추가 |

### E. AI 케이스스터디 변환기

| ID | 기능 | 데모 동작 | 현재 |
|---|---|---|---|
| E1 | 예시 시나리오 불러오기 | 3개: 충수절제술 후 급성통증 / 폐렴 노인 고열·호흡곤란 / 당뇨발 감염위험 → 메모 칸 자동 입력 | 없음 |
| E2 | 자유 메모 입력 | 환자 증상·말·바이탈·처치 자유 서술 | 현재 (케이스 메모, 2,000자, 개인정보 감지) |
| E3 | AI 생성 | 결과: **제목**, **S-Data**(환자 말 인용), **O-Data**(진단명·바이탈·관찰), **NANDA-I 우선순위 간호진단**(1순위/2순위 + 진단명 + 영역 "영역 12. 안위"), **SOAPIE 기록**(【S】~【E】, "실습일지 복붙용") | 일부 (S/O/A/P/I/E 배열 + 간호진단 문자열 + 빠진 사정 항목) → 제목·진단 순위·NANDA 영역 추가 |
| E4 | 빈 메모 경고 | "먼저 메모를 입력하거나 예시 버튼을 눌러주세요" | 현재 (검증 오류) |
| E5 | 초안 복사 | `[제목]` + SOAPIE 전문을 클립보드로 | 없음 |
| E6 | 교수님께 과제 제출 | 제출 → 교수 제출함에 "방금 전 / 대기중"으로 추가 | **없음** |
| (현재만) | 케이스 목록·수정·삭제, 케이스별 AI 챗봇, 하루 AI 20회 제한, 메모 수정 후 "다시 정리" 표시 | — | 유지 |

### F. 선배 병동 족보 마켓 (C2C)

| ID | 기능 | 데모 동작 | 현재 |
|---|---|---|---|
| F1 | 마켓 배너 | "C2C 지식 거래 마켓", 내 보유 크레딧, `✍️ 내 실습 족보 팔고 +500 C 받기`, `💎 크레딧 충전소` | 없음 |
| F2 | 과목 분류 필터 | 전체 병동 / 성인간호(내과·외과) / 중환자실·응급실 / 모성·아동간호 / 정신·지역사회간호 | 일부 (WIP: 병동 이름 칩 필터) → 분류 필드 추가 |
| F3 | 영구 열람 안내 | "잠금 해제한 족보는 졸업 때까지 무제한 열람" | 현재 (WIP: 열람 기록 영구) |
| F4 | 족보 카드 | 병원·병동, `★ 4.9 (84명 열람)`, 제목, 작성자 + 인증 배지("4학년 A+ 인증", "졸업생 현직"), 분류, **무료 공개 팁**(분위기·준비물), **시크릿 족보**(블러 처리) | 일부 (WIP: 제목·병동·좋아요, 잠긴 본문은 DB에서 아예 안 꺼냄) → 평점·열람 수·작성자 배지·무료/유료 구분 추가 |
| F5 | 크레딧으로 잠금 해제 | 가격 300C/500C. 잔액 부족 → 오류 토스트 + 충전소 자동 열림. 성공 → 차감, 열람 수 +1, 블러 해제, 토스트 | 일부 (WIP: 1크레딧 고정, 중복 차감 방지 트랜잭션) |
| F6 | 무료 공개 족보 | 일부 족보는 처음부터 열람 가능 ("기본 무료 열람됨") | 없음 → 가격 0 |
| F7 | 족보 등록 모달 | 병원·병동명, 실습 과목 분류(4종), 한 줄 요약 제목(무료 공개), 필수 준비물·분위기(무료 맛보기), 🔒 시크릿 족보·케이스 꿀팁(유료 공개). 안내: 등록 즉시 +500C, 열람될 때마다 판매가의 80% 적립 | 일부 (WIP: 병원·병동·제목·질문·준비물·분위기·팁, +2 크레딧) |
| F8 | 내 족보 | 내가 쓴 족보는 항상 열려 있음 | 현재 (WIP) |
| (WIP만) | 좋아요, 족보 수정·삭제(삭제 시 보상 회수), 개인정보 감지 | — | 평점으로 대체 검토 (5장) |

### G. 크레딧 시스템

| ID | 기능 | 데모 동작 | 현재 |
|---|---|---|---|
| G1 | 크레딧 충전소 모달 | `500 크레딧 (병동 1곳 족보팩) ₩990`, `2,000 크레딧 (실습 로테이션 팩) ₩3,900 BEST`, `지난 실습 병동 후기 작성하기 +500 C 적립`(→ 등록 모달로) | **없음** |
| G2 | 잔액 동기화 | 헤더 배지·마켓 배너 동시 갱신 | 없음 |
| G3 | 판매 수익 적립 | 내 족보가 열릴 때마다 판매가의 80%를 작성자에게 적립 | **없음** |
| G4 | 결제 | 데모는 버튼 누르면 바로 충전(가짜) | **없음** → 실제 PG 연동 (6장) |
| (WIP만) | 크레딧 내역(Ledger), 잔액 = 내역 합계, 0 미만 금지 CHECK, 가입 보너스 트리거 | — | 유지·확장 |

### H. 수액 gtt 계산기 · 도구

| ID | 기능 | 데모 동작 | 현재 |
|---|---|---|---|
| H1 | 수액 주입 속도 계산기 | 총 용량(mL, 기본 1000), 주입 시간(hr, 0.5 단위, 기본 8), 수액세트(일반 20 / 소아·마이크로 60 / 수혈 15 gtt/mL) → **mL/hr**, **분당 방울 수(반올림)**, **몇 초마다 1방울**. 입력 즉시 재계산. 떨어지는 방울 애니메이션 | 없음 |
| H2 | 연령별 활력징후 정상 범위표 | 성인 / 노인 / 아동(학령기) / 신생아 × 혈압·맥박·호흡·체온 | 없음 |
| H3 | 즉시 보고(Noti) 기준 | 성인: 수축기 ≥160 또는 <90, 맥박 ≥110 또는 <50, 체온 ≥37.8°C, SpO2 <93% | 없음 |

### I. 교수(B2B) 대시보드

| ID | 기능 | 데모 동작 | 현재 |
|---|---|---|---|
| I1 | 교수 헤더 | 이름·직책(실습과장), 학교, "B2B 관리자", `대학 기관 라이선스 PRO` 배지, "2026학년도 2학기 임상실습 통합 관제 · KABONE 1,000시간 이수 증빙" | 없음 |
| I2 | 실습대장 CSV 다운로드 | 컬럼: 학번, 이름, 학년반, 현재실습지, 누적실습시간(h), 기준시간(h), 달성률(%), 이수상태. UTF-8 BOM, 파일명 `NursePass_간호교육인증평가_1000시간_실습대장.csv` | 없음 |
| I3 | KPI 카드 4개 | 현재 실습 파견 학생 수(3·4학년) + 협약 병원 수 / 학년 평균 1,000시간 달성률 / ⚠️ 실습 시간 미달 위험군(Red Flag) 수 / 제출된 케이스스터디 과제 수(채점 대기) | 없음 |
| I4 | 학생별 이수 현황판 | 학생 정보(이름, 학년반, 학번), 현재 실습지, 진행률(N / 1,000h, %, 막대 — 위험군은 빨강), 상태 배지 3종(`⚠️ 미달 위험` / `🎓 1,000h 달성` / `정상 이수중`), `알림 발송` 버튼 | 없음 (교수 탭 "학생 현황"만 자리) |
| I5 | 현황판 필터 | 전체 / ⚠️ 위험군만 | 없음 |
| I6 | 케이스스터디 제출함 | 학생 이름·학번, 병동, 제목, 제출 시각(10분 전), 채점 상태(대기중/A+/보완요청), `A+ 승인`, `피드백` | 없음 (교수 탭 "채점" 비활성) |
| I7 | 실시간 반영 | 학생이 시간을 기록하면 교수 화면에 반영 | 없음 |
| I8 | 알림 발송 | "OOO 학생에게 실습 시간 확인 및 출결 독려 알림톡 발송" | 없음 |

**합계: 데모 기능 52개 항목(A1~I8, B8~B10 포함) + 현재 저장소에만 있는 기능 유지.**

---

## 2. 목표 화면 구조 (라우트)

```
app/
  login/                    로그인 (이메일 또는 학번+학교) + 체험 로그인 버튼            B1~B7
  signup/                   회원가입 (학교·학번·학년반·역할 신청)                         B8
  reset-password/           비밀번호 재설정                                              B10
  (app)/
    layout.tsx              헤더(로고·크레딧 배지·체험 역할 전환)·탭바·푸터·토스트          A1~A6
    page.tsx                학생: 1,000시간 홈 / 교수: 대시보드 (역할로 분기)              C·D / I
    cases/                  케이스 목록                                                  E
    cases/[id]/             메모·AI 결과·복사·제출·챗봇                                   E1~E6
    submissions/            (학생) 내 제출 과제와 채점 결과                               E6, I6
    notes/                  족보 마켓 (분류 필터, 카드, 잠금 해제)                         F1~F6
    notes/new, [id]/edit    족보 등록·수정                                                F7
    credits/                충전소 + 크레딧 내역                                          G1~G3
    credits/success|fail    결제 결과                                                     G4
    tools/                  gtt 계산기 + 활력징후 표                                      H1~H3
    notifications/          알림함                                                       I8
    prof/students/[id]/     (교수) 학생 상세: 과목별 시간·일지 인증                        I4, I7
    prof/submissions/       (교수) 제출함·채점                                            I6
    prof/rotations/         (교수) 로테이션·조 편성 (D4 데이터 원천)                       D4
  api/
    prof/export/route.ts    실습대장 CSV                                                 I2
    payments/webhook/route.ts  Toss 웹훅                                                 G4
```

탭: 학생 `실습 / 케이스 / 족보 / 도구`, 교수 `학생 현황 / 채점 / 로테이션`. 비로그인(오픈형)은 학생 탭과 같고, 저장 시 로그인 안내.

---

## 3. 데이터 모델 변경

(★ = 신규 모델, + = 필드 추가)

### 3-1. 조직·계정

```prisma
enum Role { student professor admin }          // + admin: 서비스 운영자(인증 배지·신고 처리)

model Organization {                           // ★ 학교/기관 (B3, I1)
  id          String   @id @default(cuid())
  name        String   @unique                 // "동의과학대학교 간호학과"
  shortName   String                           // "DIT"
  plan        OrgPlan  @default(free)          // free | pro (라이선스 배지)
  licenseUntil DateTime?
  inviteCode  String   @unique                 // 교수 가입용 초대 코드 (주기적으로 교체)
  semester    String                           // "2026-2"
  createdAt   DateTime @default(now())
}

model Profile {
  + orgId       String?                        // 소속 학교
  + memberNo   String?   @db.VarChar(20)      // 학번/교번. @@unique([orgId, memberNo])
  + grade       Int?                           // 학년 3·4
  + classGroup  String?   @db.VarChar(10)      // 반 "B"
  + staffTitle  String?   @db.VarChar(30)      // 교수 직책 "실습과장", "조교"
  + isDemo      Boolean   @default(false)      // 체험 계정 (결제 차단 등)
  + verifiedBadge String? @db.VarChar(30)      // "A+ 인증", "졸업생(현직)" — admin만 지정 (F4)
}
```

**역할 정책**: 가입 화면에서 "지도교수/조교"를 고를 수 있지만(B6), **학교 초대 코드가 맞아야만** professor로 만든다. 코드 없이 고르면 student로 가입 + "교수 인증 대기" 상태. (스스로 교수 권한을 얻는 것을 막음)

**학번 로그인(B4)**: Supabase Auth는 이메일 기반이므로, 로그인 폼에서 "학교 + 학번"을 받으면 서버가 `Profile(orgId, memberNo)`로 이메일을 찾아 `signInWithPassword`에 넘긴다. 이메일 로그인도 그대로 지원. (존재 여부가 드러나지 않게 오류 메시지는 동일하게)

### 3-2. 실습 시간

```prisma
enum Subject { adult maternal child community psych management }   // D2 6과목
enum Shift   { day evening night }
enum LogStatus { pending approved rejected }

model SubjectTarget {                          // ★ 과목별 목표 시간 (학교별로 다를 수 있음)
  orgId   String?                              // null = 기본값 (320/120/120/160/160/120)
  subject Subject
  hours   Int
  @@id([orgId, subject])                       // 실제로는 기본값 행을 위해 별도 처리
}

model PracticeLog {
  + subject    Subject                         // D2·D3
  + shift      Shift?                          // D3 "Day/Evening"
  + status     LogStatus @default(pending)     // D6 "인증 내역", I7
  + reviewedBy String?   @db.Uuid              // 인증한 교수
  + reviewedAt DateTime?
}
```

- 기존 일지는 마이그레이션에서 `subject = adult`로 채우고, 화면에 "과목 미지정" 안내 후 수정하게 한다.
- **1주 일괄(40시간)**: 한 줄에 40시간을 넣지 않는다(하루 24시간 검증 유지). "시작일 + 5일 × 8시간"으로 **날짜별 일지 5개를 한 트랜잭션으로** 만든다. 주말 제외 옵션.
- 인증(pending/approved): 누적 시간은 기본적으로 **전체(pending 포함)**를 보여주고, CSV·교수 화면에는 "인증 완료 시간"을 따로 표시. 학교가 원하면 인증 시간만 집계하도록 Organization 설정으로 전환.

### 3-3. 일정·로테이션·체크리스트

```prisma
model Rotation {                               // ★ 교수가 만드는 실습 로테이션 (D4)
  id             String   @id @default(cuid())
  orgId          String
  subject        Subject                       // "성인간호학실습 II" → subject + title
  title          String   @db.VarChar(60)
  hospital       String   @db.VarChar(60)
  ward           String   @db.VarChar(60)
  department     String?  @db.VarChar(30)      // "소화기내과"
  startDate      DateTime @db.Date
  endDate        DateTime @db.Date
  shift          Shift
  shiftStart     String   @db.VarChar(5)       // "07:00"
  shiftEnd       String   @db.VarChar(5)       // "15:00"
  meetingPlace   String?  @db.VarChar(80)      // "본관 7층 엘리베이터 앞"
  meetingTime    String?  @db.VarChar(5)       // "06:40"
  preceptor      String?  @db.VarChar(40)      // "박지영 수간호사"
  commonDiseases String[]                      // ["간경변증", "위장관출혈", "급성췌장염"]
  createdBy      String   @db.Uuid
}

model RotationMember {                         // ★ 조 편성
  rotationId String
  studentId  String @db.Uuid
  groupNo    Int                               // 3조
  @@id([rotationId, studentId])
}

model PracticeSchedule {                       // 개인 일정 (학교 미가입 학생용) — 같은 상세 필드를 선택 항목으로 추가
  + endDate, department, shift, shiftStart, shiftEnd, meetingPlace, meetingTime, preceptor, commonDiseases
}

model ChecklistItem {                          // ★ 준비물 체크리스트 (D5)
  id         String  @id @default(cuid())
  userId     String  @db.Uuid
  text       String  @db.VarChar(100)
  done       Boolean @default(false)
  sortOrder  Int
  @@index([userId, sortOrder])
}
```

- "다음 실습" = 오늘 이후 가장 가까운 것 (배정된 Rotation ∪ 개인 PracticeSchedule).
- "현재 로테이션"(C1) = 오늘이 기간 안에 있는 Rotation.
- 조원(D4) = 같은 rotationId·groupNo의 학생 이름.
- 체크리스트: 처음 열 때 기본 6개 항목을 만들어 준다. 추가·삭제·순서 변경 가능. (병동별 맞춤 체크리스트는 추후)

### 3-4. 케이스 AI · 제출

```ts
// caseAiOutputSchema v2 (E3)
{
  title: string,                               // ★ 케이스 제목 제안
  S: string[], O: string[], A: string[], P: string[], I: string[], E: string[],
  diagnoses: { priority: 1|2|3, name: string, relatedTo: string, domain: string }[],  // ★ 순위 + NANDA-I 영역
  missingInfo: string[],
}
```

- 기존 저장 결과(v1)는 `nursingDiagnoses: string[]` → 읽을 때 `priority = 순서, domain = ""`로 변환해서 보여준다(재생성 불필요).
- 예시 시나리오 3개(E1)는 **정적 데이터**(`lib/case-presets.ts`). 불러오면 새 케이스 작성 폼에 메모를 채운다. AI 호출은 사용자가 누를 때만 (하루 20회 제한 유지).
- 복사(E5): `[제목]\n\n【S】…【E】…` 형식으로 `navigator.clipboard.writeText`.

```prisma
enum SubmissionStatus { submitted graded revision }

model CaseSubmission {                         // ★ 과제 제출 (E6, I6)
  id          String   @id @default(cuid())
  caseId      String?                          // 원본 케이스 (지워져도 제출본은 남음)
  studentId   String   @db.Uuid
  orgId       String
  rotationId  String?
  title       String   @db.VarChar(60)
  ward        String   @db.VarChar(60)
  memo        String   @db.VarChar(2000)       // 제출 시점 스냅샷 (이후 수정해도 제출본은 고정)
  aiResult    Json
  status      SubmissionStatus @default(submitted)
  grade       String?  @db.VarChar(10)         // "A+", "A", "B+" …
  feedback    String?  @db.VarChar(2000)
  gradedBy    String?  @db.Uuid
  submittedAt DateTime @default(now())
  gradedAt    DateTime?
  @@index([orgId, status, submittedAt(sort: Desc)])
  @@index([studentId, submittedAt(sort: Desc)])
}
```

- 제출 조건: AI 정리 결과가 있고 메모가 정리 이후 바뀌지 않았을 것(stale이면 "다시 정리 후 제출").
- 같은 케이스 재제출 = 새 제출본(이전 것은 이력). "보완요청" 받은 뒤 재제출 흐름.
- 학교 미가입 학생은 제출 버튼 비활성 + "학교 연결 후 제출 가능" 안내.

### 3-5. 족보 · 크레딧 · 결제

```prisma
enum NoteCategory { adult critical maternal_child psych_community }   // F2 4분류

model WardNote {                               // WIP 모델 확장
  + category    NoteCategory
  + price       Int  @default(300)             // 0 | 300 | 500 (F5, F6). 서버가 허용값만 받음
  + salesCount  Int  @default(0)               // "84명 열람"
  + ratingSum   Int  @default(0)
  + ratingCount Int  @default(0)               // ★ 4.9 = sum / count
  // 무료 공개 = title, supplies, atmosphere    (F7 "무료 맛보기")
  // 유료 공개 = questions, tips                (F7 "시크릿 족보")
  + status      NoteStatus @default(published) // published | hidden (신고 처리)
}

model WardNoteRating {                         // ★ 평점 (열람한 사람만, 1인 1회, 수정 가능)
  userId String @db.Uuid
  noteId String
  score  Int                                   // 1~5, CHECK
  @@id([userId, noteId])
}

enum CreditReason {
  signup            // 가입 보너스
  upload            // 족보 등록 보상
  delete_note       // 등록 보상 회수
  unlock            // 열람 차감
  sale              // ★ 판매 수익(80%)
  purchase          // ★ 유료 충전
  refund            // ★ 결제 취소
  admin_adjust      // ★ 운영자 조정
}

model CreditLedger {
  + paymentId String?                          // purchase/refund일 때
  + counterpartyId String? @db.Uuid            // sale: 구매자, unlock: 작성자
}

model Payment {                                // ★ (G4)
  id          String   @id @default(cuid())
  orderId     String   @unique                 // 서버가 만든 주문 번호
  userId      String   @db.Uuid
  packageId   String                           // "pack_500" | "pack_2000"
  amount      Int                              // 원화. 서버 상수표에서만 결정
  credits     Int
  status      PaymentStatus @default(ready)    // ready | done | canceled | failed
  paymentKey  String?  @unique                 // Toss
  approvedAt  DateTime?
  canceledAt  DateTime?
  createdAt   DateTime @default(now())
}

model Notification {                           // ★ (I8, 채점 결과·판매 알림)
  id        String   @id @default(cuid())
  userId    String   @db.Uuid
  kind      String   @db.VarChar(30)           // practice_reminder | graded | note_sold …
  title     String   @db.VarChar(80)
  body      String   @db.VarChar(500)
  link      String?  @db.VarChar(200)
  readAt    DateTime?
  createdAt DateTime @default(now())
  @@index([userId, readAt, createdAt(sort: Desc)])
}
```

모든 신규 테이블은 기존처럼 **RLS 켜고 정책 없음**(anon 키로 직접 접근 불가, Prisma로만 접근).

---

## 4. 크레딧 경제 설계

### 4-1. 수치 (데모 기준, 한 파일 `lib/credits.ts` 상수로 관리)

| 항목 | 값 | 출처 |
|---|---|---|
| 가입 보너스 | **300C** (족보 1개 열람분) | ✅ 확정 (2026-10-29) |
| 족보 열람 가격 | 작성자가 0 / 300 / 500 중 선택 | 데모 300·500, 무료 족보 존재 |
| 족보 등록 보상 | **+500C** | 데모 |
| 판매 수익 | 열람 1회당 가격의 **80%** (300→240C, 500→400C), 소수점 버림 | 데모 |
| 충전 상품 | 500C = ₩990 / 2,000C = ₩3,900 (BEST) | 데모 |
| 열람 권한 | 영구 ("졸업 때까지 무제한") | 데모 |

### 4-2. WIP 작업과의 차이 (반드시 정리)

현재 커밋 안 된 `20261029040000_ward_notes_credits` 마이그레이션은 **가입 3 / 등록 +2 / 열람 -1**이다. 데모 수치로 바꾼다.
- `npx prisma migrate status`로 이 마이그레이션이 **DB에 이미 적용됐는지 먼저 확인**.
  - 적용 안 됨 → 이 마이그레이션 파일을 직접 수정.
  - 적용됨 → 새 마이그레이션 추가(기존 잔액 환산 규칙 포함: 예) 기존 1C = 100C).
- `Profile_signup_credit` 트리거, `CreditLedger_once_per_note` 부분 고유 인덱스는 유지. `sale`은 같은 (작성자, 족보)에 여러 번 생기므로 인덱스 대상에서 제외 — 대신 `(counterpartyId, noteId, reason='sale')` 고유로 1구매 1수익 보장.

### 4-3. 잠금 해제 트랜잭션 (F5 + G3)

한 트랜잭션 안에서:
1. 족보 조회(작성자, 가격, 상태). 내 족보 → `mine`, 숨김 → `not_found`.
2. `WardNoteUnlock` INSERT … ON CONFLICT DO NOTHING → 0행이면 `already` (연타·두 기기 동시 클릭에도 1회만).
3. 가격 0이면 여기서 끝.
4. 구매자 `credits >= price` 조건부 차감 → 0행이면 전체 롤백 → `insufficient`(화면: 오류 토스트 + 충전소 열기).
5. 작성자 `credits += floor(price × 0.8)`.
6. 원장 2줄: 구매자 `unlock -price`, 작성자 `sale +수익`.
7. `salesCount + 1`.
8. 작성자에게 "족보가 열람됐어요 +240C" 알림.

### 4-4. 등록 보상 어뷰징 방지 (중요)

등록 보상(500C)이 열람 가격(300C)보다 커서, **쓰레기 족보를 올려 무한으로 크레딧을 버는 구멍**이 생긴다. 다음을 모두 적용:
- 보상은 **하루 1회, 월 4회**까지 (그 이상 등록은 가능하지만 보상 없음).
- 본문(유료 영역) 최소 분량: 질문·팁 합계 3줄 이상 또는 150자 이상.
- 삭제 시 보상 회수(WIP에 있음, 잔액 부족하면 0까지만).
- 같은 병동·제목 중복 등록 차단.
- 신고 3건 이상 → 자동 숨김, admin 검토. 숨김 확정 시 보상 회수.
- 판매 수익·보상 크레딧은 **현금 인출 불가** (현금화하면 전자금융·세무 문제 발생). 크레딧은 서비스 안에서만 사용.

### 4-5. 유료 크레딧 환불

- 전자상거래법상 미사용 유료 상품은 7일 내 청약철회 가능 → 결제 후 7일 이내, **해당 결제로 받은 크레딧을 아직 쓰지 않았으면** 전액 취소.
- 판단: 잔액 ≥ 그 결제 크레딧 && 결제 이후 `unlock` 원장 없음 → 취소 가능. 취소 시 `refund -credits` 원장 + Toss 취소 API.

---

## 5. 족보 화면 상세

- 목록: 최신순 20개씩 + 분류 필터(F2) + 병동 검색(WIP 칩 유지). 정렬 옵션 "인기순(salesCount)" 추가.
- 카드: 잠긴 족보는 **유료 영역을 서버에서 아예 보내지 않는다**(WIP 방식 유지). 블러는 "가짜 회색 줄" 자리표시로 표현 — 실제 글을 흐리게 보내면 개발자 도구로 다 보인다(데모의 보안 구멍).
- 작성자 표시: `{학년}학년 {성 + "선배"}` 형태로 자동 생성 + `verifiedBadge`. 실명 노출 금지.
- 평점: 연 사람만, 1~5점, 다시 누르면 수정. 좋아요(WIP)는 **평점으로 대체**(둘 다 두면 의미 중복) — 결정 필요.
- 등록 폼(F7) 매핑: 데모 "필수 준비물 & 분위기" → `supplies` + `atmosphere`(무료), 데모 "시크릿 족보" → `questions` + `tips`(유료). 개인정보 감지는 모든 칸에 유지.
- 마켓 배너·충전소 버튼(F1), 다음 실습 카드의 "해당 병동 족보 보러가기"(D4)는 `/notes?ward=72병동`처럼 필터가 걸린 채 이동.

---

## 6. 결제 설계 (G1, G4)

- PG: **토스페이먼츠 결제위젯** (국내 카드·간편결제).
- 흐름:
  1. 충전소에서 상품 선택 → 서버 액션 `createOrder(packageId)`: 서버 상수표에서 금액·크레딧 결정, `Payment(ready, orderId)` 저장 (**금액을 브라우저에서 받지 않음**).
  2. 결제위젯 열기(`NEXT_PUBLIC_TOSS_CLIENT_KEY`) → 성공 시 `/credits/success?paymentKey&orderId&amount`로 이동.
  3. 서버: `orderId`로 Payment 조회 → amount가 저장값과 같은지 확인 → Toss 승인 API(`TOSS_SECRET_KEY`) 호출.
  4. 한 트랜잭션: Payment `done` + 크레딧 증가 + 원장 `purchase`. `orderId` 고유 + 상태 조건부 업데이트로 **새로고침·중복 호출에도 1회만 충전**.
  5. 웹훅(`/api/payments/webhook`)으로 취소·실패 상태 동기화.
- 체험 계정(`isDemo`)은 실제 결제 불가 → 데모처럼 "가짜 충전" 버튼만 보여 줌.
- **실서비스 결제 전 필요한 것 (개발 외 작업)**: 사업자등록, 통신판매업 신고, 토스페이먼츠 가맹 심사, 이용약관·환불정책·개인정보처리방침 페이지. 그 전까지는 **테스트 키로만** 동작.

---

## 7. 교수 대시보드 상세 (I1~I8)

- **권한**: 모든 교수 조회는 `orgId = 내 학교`로 제한. 다른 학교 학생은 존재 자체를 모른다.
- **KPI(I3)**
  - 파견 학생 수: 오늘 진행 중인 Rotation에 배정된 학생 수(학년별), 협약 병원 수 = 그 Rotation들의 고유 병원 수.
  - 평균 달성률: 학교 학생 전체 `min(누적/목표, 100%)` 평균.
  - 위험군: 아래 규칙으로 계산한 RISK 수.
  - 제출 과제: `status = submitted` 개수.
- **위험군 규칙(I4)**: 학기 진행률 대비 기대 시간보다 **10%p 이상 뒤처짐** = RISK, 누적 ≥ 목표 = DONE, 나머지 NORMAL. 교수가 수동으로 위험군 지정·해제 가능(병가·결석 사유 메모).
- **현황판(I4, I5)**: 학번·이름·학년반·현재 실습지·진행률·상태. 필터 전체/위험군. 학생을 누르면 상세(과목별 시간, 일지 목록, 일지 인증 승인/반려).
- **알림 발송(I8)**: 1차는 앱 안 알림(Notification) + 이메일(Supabase/Resend). 카카오 알림톡은 사업자·발신 프로필 심사가 필요해 2차. 같은 학생에게 하루 1회 제한.
- **채점(I6)**: 제출본 보기(메모·S/O·진단·SOAPIE) → 학점 선택(A+~F) + 피드백 글 → `graded`, 또는 "보완요청" → `revision`. 학생에게 알림. 데모의 원클릭 `A+ 승인`은 빠른 버튼으로 유지.
- **CSV(I2)**: 라우트 핸들러에서 교수 권한·학교 확인 후 생성. UTF-8 BOM, 데모와 같은 8개 컬럼 + `인증완료시간(h)` 추가. 셀이 `= + - @`로 시작하면 앞에 `'`를 붙여 **엑셀 수식 주입 방지**, 쉼표·따옴표는 따옴표로 감싸기.
- **실시간 반영(I7)**: 학생이 일지를 저장하면 `updateTag("org:{orgId}:progress")` → 교수 화면 다음 요청에 최신값. 화면을 띄워 둔 채 바뀌는 것은 30초 폴링 또는 Supabase Realtime(2차).
- **로테이션 관리**: 교수가 Rotation 생성·수정, 학생 배정·조 편성(CSV 업로드 2차). 학생 홈 D4 카드의 원천 데이터.
- **라이선스 배지(I1)**: `Organization.plan`. free 학교는 교수 기능 중 CSV·위험군 알림을 잠그는 식으로 B2B 과금 여지 확보(정책 결정 필요).

---

## 8. 체험(데모) 모드 (A2, B2)

- 시드로 체험 계정 2개(학생 "김간호", 교수 "이교수")와 체험 학교, 샘플 데이터(데모와 같은 일지·족보 4개·학생 6명·제출 2건) 생성.
- 로그인 화면의 `원클릭 체험` 버튼 → 서버 액션이 서버에만 있는 체험 비밀번호로 로그인. `DEMO_LOGIN_ENABLED`가 꺼져 있으면 버튼 숨김.
- 체험 계정으로 로그인했을 때만 헤더에 **역할 전환 바**(로그인 화면 / 학생 뷰 / 교수 뷰) 표시. 일반 계정에는 절대 안 보임.
- 체험 계정은 실제 결제 차단, 하루 1번 샘플 데이터로 초기화(크론 2차), 체험 학생의 글은 실제 마켓에 노출하지 않음.

---

## 9. 도구 (H1~H3)

- 모두 **클라이언트 전용**(서버·DB 불필요), 비로그인도 사용 가능.
- gtt 공식: `mL/hr = 용량 / 시간`, `gtt/min = 용량 × 세트계수 / (시간 × 60)`(반올림 표시), `초/방울 = 60 / gtt/min`. 입력값 검증: 용량 > 0, 시간 ≥ 0.5, 0으로 나누기 방지.
- 활력징후 표·Noti 기준: 데모 수치를 그대로 쓰되 **교재·학교 기준 확인 후 확정**, 화면에 "참고용, 병원·교수님 기준이 우선" 안내.

---

## 10. 공통 · 비기능

- 토스트(A4): 전역 토스트 컴포넌트 1개, 서버 액션 결과(성공·주의·오류)를 연결.
- 개인정보: 기존 `detectPii`를 케이스·족보·일지·피드백 전부에 적용(유지).
- AI 면책: 케이스 결과 아래 "AI 초안 — 반드시 직접 검토" 고정 문구.
- 권한 확인: 모든 서버 액션에서 로그인 사용자 id·역할·학교를 서버에서 확인(기존 `server/auth.ts` 패턴). 크레딧·가격·금액은 브라우저 값 무시.
- 캐시: 프로필 캐시(`profile:{id}` 태그)에 orgId·학번 추가. **크레딧 잔액은 캐시하지 않음**(자주 바뀜).
- 검증: zod 스키마 `lib/validation/*`에 추가(조직, 회원가입 v2, 로테이션, 체크리스트, 제출, 채점, 결제).
- 테스트: 크레딧 트랜잭션(동시 열람·잔액 부족·중복 결제), 위험군 계산, gtt 계산, CSV 이스케이프는 단위 테스트 필수.

---

## 10-1. 반응형 (필수)

색·장식 같은 디자인은 이번 범위 밖이지만, **모든 화면이 휴대폰~데스크톱에서 깨지지 않고 쓸 수 있어야 하는 것은 필수 요구사항**이다. 학생은 병동에서 휴대폰으로, 교수는 PC로 주로 쓴다.

| 구간 | 너비 | 기준 기기 |
|---|---|---|
| 모바일 | < 640px | 360px(갤럭시)·390px(아이폰)에서 반드시 확인 |
| 태블릿 | 640 ~ 1023px | |
| 데스크톱 | ≥ 1024px | 콘텐츠 최대 폭 1280px 가운데 정렬 |

공통 규칙
- **모바일 우선**으로 작성(기본 스타일 = 모바일, `sm:` `lg:`로 넓힘). 가로 스크롤이 페이지 전체에 생기면 안 됨.
- 내비게이션: 모바일은 **하단 탭바**(현재 구조 유지), 데스크톱은 상단 헤더 안 탭. 크레딧 배지는 모든 구간에서 보이게.
- 버튼·체크박스 등 누르는 영역은 최소 44×44px. 입력칸 글자 16px 이상(iOS 자동 확대 방지).
- 모달(충전소·족보 등록): 모바일은 **아래에서 올라오는 전체 폭 시트**, 높이 90% 이내 + 내부 스크롤, 데스크톱은 가운데 대화상자.
- 표(활력징후, 교수 현황판): 모바일에서는 **카드 목록으로 전환**하거나 표 자체만 가로 스크롤(`overflow-x-auto`). 현황판은 카드 전환 권장.
- 토스트: 모바일은 하단 탭바 위 가운데, 데스크톱은 오른쪽 아래.
- 긴 병원·병동명, 숫자(1,000h)는 줄바꿈/말줄임 처리로 레이아웃이 밀리지 않게.

화면별 배치 (데모 그리드 기준)

| 화면 | 모바일 | 데스크톱(≥1024) |
|---|---|---|
| 로그인 | 소개 영역 → 로그인 폼 세로 쌓기(소개는 축약) | 좌 소개 / 우 폼 2단 |
| 학생 홈 | 게이지 → 다음 실습 → 체크리스트 → 과목별 현황(1열) → 최근 내역 | 게이지·과목(7) / 다음 실습·체크리스트(5) |
| 빠른 기록 폼 | 칸 1열 쌓기, 시간 프리셋은 가로 칩 | 한 줄 4칸 |
| 케이스 AI | 메모 입력 → 결과(아래로). 생성 후 결과 위치로 자동 스크롤 | 입력(5) / 결과(7) |
| 족보 마켓 | 카드 1열, 분류 필터는 가로 스크롤 칩 | 카드 2열 |
| 도구 | 계산기 → 활력징후(카드형) | 6 / 6 2단 |
| 교수 대시보드 | KPI 2×2 → 학생 카드 목록 → 제출함 | KPI 4열, 현황판 표(7) / 제출함(5) |

점검: 각 단계 완료 조건에 "360px · 768px · 1280px 세 너비에서 화면 확인"을 포함한다.

---

## 11. 단계별 진행 순서

| 단계 | 내용 | 기능 ID |
|---|---|---|
| P0 | 보안 기반: `lib/env.ts`, 비밀 검사, GitHub push protection | 0장 |
| P1 | 조직·계정: Organization, 회원가입 v2, 학번 로그인, 교수 초대 코드, 비밀번호 재설정, 프로필 배너 | B1~B10, C1 |
| P2 | 실습 트래커 확장: 과목·듀티·프리셋·1주 일괄, 과목별 현황, 남은 듀티일, 체크리스트, 상세 일정 | D1~D6 |
| P3 | 케이스 AI v2: 제목·진단 순위·영역, 예시 3개, 복사, 과제 제출 | E1~E6 |
| P4 | 족보·크레딧: WIP 수치 조정, 분류·가격·평점·판매 수익, 충전소 화면, 헤더 잔액 | F1~F8, G1~G3, A3 |
| P5 | 결제: 토스 테스트 연동, 환불 | G4 |
| P6 | 도구: gtt 계산기, 활력징후 표 | H1~H3 |
| P7 | 교수: 로테이션, KPI, 현황판, 위험군, 알림, 채점, CSV, 일지 인증 | I1~I8 |
| P8 | 체험 모드·시드·알림함·푸터·토스트 정리, 통합 점검 | A1~A6, A2, B2 |

---

## 12. 결정이 필요한 항목

> 배포: Vercel은 저장소 주인(dev-lucy25)이 main으로 배포 → 현재 대기 상태 (2026-10-29)

1. ~~가입 보너스 크레딧 양~~ → ✅ **300C 확정** (2026-10-29)
2. ~~좋아요 vs 평점~~ → ✅ **평점(1~5)으로 대체**, 좋아요 제거 (2026-10-29)
3. ~~WIP 마이그레이션 적용 여부~~ → ✅ 이미 적용됨 → 크레딧 수치는 **신규 마이그레이션**으로 조정
4. ~~실습 시간 집계 기준~~ → ✅ **전체 기준 + 교수 인증분 별도 표시** (2026-10-29)
5. 결제 실서비스 시점 (사업자등록 여부) — 그 전엔 테스트 결제만
6. 무료(free) 학교에서 잠글 교수 기능 범위
7. 활력징후·Noti 기준 수치의 출처(교재/학교 기준) 확정

---

## 13. 데모 새 버전(nursepass_ai (1).html, 2026-10-30 확인)에서 추가된 기능

| 새 기능 | 반영 |
|---|---|
| 방 코드: 교수가 실습반 방 코드를 정하고, 학생은 가입·내 정보에서 입력. 교수 현황판은 "같은 학교 또는 같은 방" 학생 + "같은 방 코드만" 필터 | P7 |
| 교수 KPI: 매칭 학생 수·평균 달성률·위험군(500시간 미만)·제출 과제 수, CSV에 소속학교·방코드 열 | P7 |
| 교수 화면 탭: 학생 현황 / 제출함 | P7 |
| AI 초안 수정 요청: 빠른 버튼 4개(EMR 학술 용어로 다듬기, 낙상 위험 진단·중재 추가, 비약물 통증 완화·정서 지지 추가, 교육·퇴원 교육 보강) + 직접 지시 | P3 보강 (Gemini) |
| SOAPIE 직접 고치기 | P3 보강 |
| 내 크레딧 & 활동 요약: 보유 크레딧·열람한 족보·제출한 케이스 | 내 정보 |
| 일정의 "핵심 준비사항" | 실습 일정 |
| 다른 기기 연동(동기화 코드)·데이터 초기화 | 서버 계정이라 로그인하면 자동 연동 → 불필요 |
| OpenAI 키 직접 입력 | 넣지 않음 (키는 서버에만, 0장 보안 원칙) |
