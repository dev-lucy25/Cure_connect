// 환자를 알아볼 수 있는 정보(이름·전화번호·주민번호·등록번호)처럼 보이는 내용을 찾는다.
// 화면(입력 중 안내)과 서버(저장 차단)가 같은 함수를 쓴다. 완벽한 판별기가 아니라 실수를 막는 안전망이다.

export type PiiKind = "phone" | "rrn" | "record" | "name";

export const PII_LABEL: Record<PiiKind, string> = {
  phone: "전화번호",
  rrn: "주민등록번호",
  record: "등록번호",
  name: "이름",
};

const SURNAMES =
  "김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반라왕금옥육인맹제모탁국어은편용예경봉사부";

// 이름 뒤에 붙는 호칭. "환자"는 '담당 환자'처럼 일반 낱말과도 붙으므로 아래 예외 목록으로 거른다.
const NAME_PATTERN = new RegExp(`(?:^|[^가-힣])([${SURNAMES}][가-힣]{1,2})\\s?(환자|님|씨|할머니|할아버지|어르신|아버님|어머님)`, "g");

// 성씨 글자로 시작하지만 사람 이름이 아닌 낱말
const NOT_NAMES = new Set([
  "이번", "오늘", "정말", "전체", "신규", "선생", "선배", "후배", "교수", "이모", "고객", "보호", "보호자",
  "주간", "야간", "고령", "남자", "여자", "남성", "여성", "노인", "소아", "성인", "기존", "다른", "해당",
  "한명", "한분", "두분", "세분", "이분", "그분", "모든", "여러", "부모", "부모님", "어머", "아버", "할머",
  "할아", "환자", "수간", "간호", "주치", "담당", "입원", "수술", "당뇨", "고혈", "중환", "응급", "외래",
  "병동", "원장", "과장", "실장", "팀장", "사장", "회장", "주임", "조교", "조장", "반장", "동기", "친구",
  "선임", "후임", "우리", "저희", "나이", "연세", "정상", "이상", "안정", "불안", "통증", "고통",
]);

const PATTERNS: [PiiKind, RegExp][] = [
  ["rrn", /\d{6}\s?-\s?[1-4]\d{6}/],
  ["phone", /01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/],
  ["phone", /0\d{1,2}[-\s.]\d{3,4}[-\s.]\d{4}/],
  ["record", /(등록\s*번호|환자\s*번호|병록\s*번호|차트\s*번호|MRN)\s*[:：]?\s*\d{3,}/i],
  // 긴 숫자 덩어리(등록번호 등). 날짜(2026-10-29)나 숫자 사이 구분자는 끊어서 본다.
  ["record", /(?<!\d)\d{7,}(?!\d)/],
];

/** 찾은 종류를 중복 없이 돌려준다. 없으면 빈 배열. */
export function detectPii(text: string): PiiKind[] {
  const found = new Set<PiiKind>();
  for (const [kind, re] of PATTERNS) {
    if (re.test(text)) found.add(kind);
  }
  for (const m of text.matchAll(NAME_PATTERN)) {
    const word = m[1];
    if (!NOT_NAMES.has(word) && !NOT_NAMES.has(word.slice(0, 2))) found.add("name");
  }
  return [...found];
}

export function piiMessage(kinds: PiiKind[]) {
  return `환자 식별 정보는 지워 주세요 (${kinds.map((k) => PII_LABEL[k]).join(", ")}처럼 보이는 내용이 있어요)`;
}
