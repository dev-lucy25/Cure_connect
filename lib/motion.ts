// 모션 값 — 토스처럼 짧고 탄력 있는 움직임. 화면의 모든 모션은 여기 값만 쓴다.
// (움직임 줄이기 설정을 켠 사용자는 MotionProvider가 위치·크기 움직임을 끈다)

/** 탭 표시·버튼 누름처럼 손가락에 바로 붙는 움직임 */
export const SPRING_SNAPPY = { type: "spring", stiffness: 520, damping: 38, mass: 0.8 } as const;

/** 카드 등장·진행 바·펼침처럼 조금 더 여유 있는 움직임 */
export const SPRING_SOFT = { type: "spring", stiffness: 260, damping: 30, mass: 1 } as const;

/** 아래에서 살짝 떠오르며 나타나기 */
export const FADE_UP = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
} as const;

/** 목록·카드가 차례로 나타나는 간격(초) */
export const STAGGER_STEP = 0.05;

/** 키프레임 3개 이상(톡 튀기·흔들기)용. 스프링은 키프레임 2개까지만 된다 */
export const TWEEN_POP = { type: "tween", duration: 0.32, ease: [0.22, 1, 0.36, 1] } as const;

/** 누르면 살짝 작아짐 */
export const TAP_SCALE = 0.97;
