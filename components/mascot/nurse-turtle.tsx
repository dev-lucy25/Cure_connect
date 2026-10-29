// 너스패스 마스코트: 간호 캡을 쓴 아기 거북이 — "느려도 꾸준히 1,000시간".
// 그림 파일 없이 인라인 SVG로만 그린다. 얇고 연한 선, 콩알 눈, 떡 같은 실루엣, 소품은 단계마다 하나.
// 서버 컴포넌트라 클라이언트 JS가 없다. 색은 globals.css 디자인 토큰을 그대로 쓴다.

export type TurtleStage = 1 | 2 | 3 | 4 | 5;
export type TurtleMood = "default" | "empty" | "loading" | "saved" | "error";

const STAGE_LABEL: Record<TurtleStage, string> = {
  1: "알에서 막 나온 간호 캡 아기 거북이",
  2: "하트 이름표를 단 실습생 거북이",
  3: "청진기를 건 거북이",
  4: "반짝이는 능숙한 거북이",
  5: "학사모를 쓴 졸업 거북이",
};

const MOOD_LABEL: Record<TurtleMood, string> = {
  default: "",
  empty: ", 고개를 갸웃하는 중",
  loading: ", 꾸벅꾸벅 기다리는 중",
  saved: ", 기뻐하는 중",
  error: ", 울먹이는 중",
};

/** 진행률(0~100)에 맞는 거북이 단계 */
export function turtleStage(percent: number): TurtleStage {
  if (percent >= 100) return 5;
  if (percent >= 75) return 4;
  if (percent >= 50) return 3;
  if (percent >= 25) return 2;
  return 1;
}

const C = {
  line: "var(--color-ink-soft)",
  ink: "var(--color-ink)",
  skin: "var(--color-turtle)",
  belly: "var(--color-turtle-belly)",
  shell: "var(--color-shell)",
  shellLine: "var(--color-shell-line)",
  pink: "var(--color-pink)",
  pinkDeep: "var(--color-pink-deep)",
  white: "var(--color-surface)",
  tear: "var(--color-tear)",
};

const stroke = { stroke: C.line, strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

// 표정별 몸 움직임 (globals.css 애니메이션). still이면 멈춘 그림
const MOTION: Record<TurtleMood, string> = {
  default: "animate-mascot-bob",
  empty: "animate-mascot-bob",
  loading: "animate-mascot-sway",
  saved: "animate-mascot-hop",
  error: "animate-mascot-shake",
};

const EYE_L = 47;
const EYE_R = 73;
const EYE_Y = 58;

export default function NurseTurtle({
  stage = 1,
  mood = "default",
  size = 120,
  className = "",
  decorative = false,
  still = false,
}: {
  stage?: TurtleStage;
  mood?: TurtleMood;
  size?: number;
  className?: string;
  /** 옆에 같은 뜻의 글이 있으면 true로 두어 스크린리더가 두 번 읽지 않게 한다 */
  decorative?: boolean;
  /** 여러 마리를 한꺼번에 보여줄 때처럼 움직임이 산만하면 true */
  still?: boolean;
}) {
  const label = STAGE_LABEL[stage] + MOOD_LABEL[mood];
  const a11y = decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label };

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`${still ? "" : MOTION[mood]} ${className}`}
      data-still={still || undefined}
      {...a11y}
    >
      <g transform={mood === "empty" ? "rotate(-7 60 84)" : undefined}>
        {/* 등껍질: 몸 뒤로 둥글게 보이는 부분과 육각 무늬 */}
        <ellipse cx="60" cy="91" rx="35" ry="21" fill={C.shell} {...stroke} />
        <path d="M30 84 L36 78 M90 84 L84 78 M28 96 L35 98 M92 96 L85 98" stroke={C.shellLine} strokeWidth="1.6" strokeLinecap="round" />

        {/* 발 */}
        <ellipse cx="47" cy="110" rx="7" ry="4" fill={C.skin} {...stroke} />
        <ellipse cx="73" cy="110" rx="7" ry="4" fill={C.skin} {...stroke} />

        {/* 배딱지 */}
        <path d="M41 92 Q41 79 60 79 Q79 79 79 92 Q79 108 60 108 Q41 108 41 92 Z" fill={C.belly} {...stroke} />
        <path d="M45 93 H75 M47 100 H73 M60 81 V107" stroke={C.shellLine} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />

        {/* 앞발(지느러미) */}
        <ellipse cx="38" cy="93" rx="5" ry="8" transform="rotate(35 38 93)" fill={C.skin} {...stroke} />
        <ellipse cx="82" cy="93" rx="5" ry="8" transform="rotate(-35 82 93)" fill={C.skin} {...stroke} />

        {stage === 1 && <EggShell />}
        {stage === 2 && <HeartTag />}
        {(stage === 3 || stage === 4) && <Stethoscope />}

        {/* 머리 */}
        <ellipse cx="60" cy="60" rx="29" ry="25" fill={C.skin} {...stroke} />
        <ellipse cx="39" cy="67" rx="6" ry="3.6" fill={C.pink} opacity="0.85" />
        <ellipse cx="81" cy="67" rx="6" ry="3.6" fill={C.pink} opacity="0.85" />
        <Face mood={mood} />
        {stage === 5 ? <GradCap /> : <NurseCap />}
      </g>

      <MoodAccent mood={mood} />
      {stage === 4 && <Sparkles />}
    </svg>
  );
}

function Face({ mood }: { mood: TurtleMood }) {
  const eyes = [EYE_L, EYE_R];
  switch (mood) {
    case "loading":
      return (
        <g fill="none" {...stroke} stroke={C.ink}>
          {eyes.map((x) => (
            <path key={x} d={`M${x - 4} ${EYE_Y} Q${x} ${EYE_Y + 3} ${x + 4} ${EYE_Y}`} />
          ))}
          <ellipse cx="60" cy="68" rx="1.6" ry="1.9" fill={C.ink} stroke="none" />
        </g>
      );
    case "saved":
      return (
        <g fill="none" {...stroke} stroke={C.ink}>
          {eyes.map((x) => (
            <path key={x} d={`M${x - 4} ${EYE_Y + 1.5} Q${x} ${EYE_Y - 3.5} ${x + 4} ${EYE_Y + 1.5}`} />
          ))}
          <path d="M55 65.5 Q60 73 65 65.5 Z" fill={C.pinkDeep} strokeWidth={1.4} />
        </g>
      );
    case "error":
      return (
        <g>
          {eyes.map((x) => (
            <g key={x}>
              <Eye x={x} />
              <path d={`M${x + 1} ${EYE_Y + 4.5} Q${x - 0.6} ${EYE_Y + 8.5} ${x + 2} ${EYE_Y + 8.9} Q${x + 4.4} ${EYE_Y + 8.5} ${x + 3} ${EYE_Y + 4.5} Z`} fill={C.tear} />
            </g>
          ))}
          <path d="M54.5 69 Q57.25 66.5 60 69 Q62.75 71.5 65.5 69" fill="none" {...stroke} stroke={C.ink} />
        </g>
      );
    case "empty":
      return (
        <g>
          {eyes.map((x) => (
            <Eye key={x} x={x} dy={-1.6} />
          ))}
          <ellipse cx="60" cy="68.5" rx="2.2" ry="1.9" fill="none" {...stroke} stroke={C.ink} strokeWidth={1.5} />
        </g>
      );
    default:
      return (
        <g>
          {eyes.map((x) => (
            <Eye key={x} x={x} />
          ))}
          <path d="M53 65.5 Q60 72.5 67 65.5" fill="none" {...stroke} stroke={C.ink} />
        </g>
      );
  }
}

// 콩알 눈 + 반짝이 하이라이트. 가끔 깜빡인다
function Eye({ x, dy = 0 }: { x: number; dy?: number }) {
  return (
    <g className="mascot-blink">
      <ellipse cx={x} cy={EYE_Y + dy} rx="3.2" ry="3.9" fill={C.ink} />
      <circle cx={x + 1.1} cy={EYE_Y - 1.4 + dy} r="1.2" fill={C.white} />
      <circle cx={x - 1} cy={EYE_Y + 1.4 + dy} r="0.55" fill={C.white} />
    </g>
  );
}

function MoodAccent({ mood }: { mood: TurtleMood }) {
  if (mood === "empty") {
    return (
      <text x="94" y="40" fontSize="15" fill={C.pinkDeep} fontFamily="var(--font-display)">
        ?
      </text>
    );
  }
  if (mood === "saved") {
    return (
      <g fill={C.pink} {...stroke} strokeWidth={1.3}>
        <path d="M102 36 C102 32.5 97.5 32 97 35.5 C96.5 32 92 32.5 92 36 C92 39.5 97 42.5 97 42.5 C97 42.5 102 39.5 102 36 Z" />
        <path d="M27 34 C27 32 24.4 31.7 24.1 33.7 C23.8 31.7 21.2 32 21.2 34 C21.2 36 24.1 37.8 24.1 37.8 C24.1 37.8 27 36 27 34 Z" />
      </g>
    );
  }
  if (mood === "loading") {
    return (
      <text x="92" y="40" fontSize="11" fill={C.line} fontFamily="var(--font-display)">
        z
      </text>
    );
  }
  return null;
}

function NurseCap() {
  return (
    <g>
      <path d="M49 39 L51.5 28 Q60 24.5 68.5 28 L71 39 Q60 36.5 49 39 Z" fill={C.white} {...stroke} />
      <rect x="58.5" y="28.8" width="3" height="7.6" rx="0.8" fill={C.pinkDeep} />
      <rect x="56.2" y="31.1" width="7.6" height="3" rx="0.8" fill={C.pinkDeep} />
    </g>
  );
}

function GradCap() {
  return (
    <g>
      <path d="M50 39 L50 30 Q60 27 70 30 L70 39 Q60 36.5 50 39 Z" fill={C.ink} {...stroke} />
      <path d="M60 17 L82 25 L60 33 L38 25 Z" fill={C.ink} {...stroke} />
      <path d="M60 25 L80 26.5 L80 35" fill="none" stroke={C.pink} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="80" cy="36.5" r="1.9" fill={C.pink} />
    </g>
  );
}

function EggShell() {
  return (
    <path
      d="M44 106 L46 112 Q60 118 74 112 L76 106 L71 109 L67 104 L63 109 L59 104 L55 109 L51 104 L47 109 Z"
      fill={C.white}
      {...stroke}
      strokeWidth={1.4}
    />
  );
}

function HeartTag() {
  return (
    <path
      d="M73 88 C73 85.6 69.8 85.2 69.4 87.6 C69 85.2 65.8 85.6 65.8 88 C65.8 90.6 69.4 92.8 69.4 92.8 C69.4 92.8 73 90.6 73 88 Z"
      fill={C.pink}
      {...stroke}
      strokeWidth={1.3}
    />
  );
}

function Stethoscope() {
  return (
    <g fill="none">
      <path d="M47 82 Q49 94 60 94.5 Q71 94 73 82" stroke={C.pinkDeep} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="60" cy="97.5" r="2.8" fill={C.pink} stroke={C.pinkDeep} strokeWidth="1.4" />
    </g>
  );
}

function Sparkles() {
  const star = (x: number, y: number, r: number) =>
    `M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z`;
  return (
    // 위쪽은 표정 장식(?, z, 하트) 자리라 비워 둔다
    <g fill={C.pink} {...stroke} strokeWidth={1.2}>
      <path d={star(106, 66, 5.5)} />
      <path d={star(14, 60, 4)} />
    </g>
  );
}
