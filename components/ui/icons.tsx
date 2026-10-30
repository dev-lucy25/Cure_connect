import type { SVGProps } from "react";

// 얇은 선 아이콘 (24px 격자, currentColor). 이모지 대신 써서 기기마다 같은 모양으로 보이게 한다.
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 22, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);

export const IconNote = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3.5h8.5L19 8v12.5H6z" />
    <path d="M14 3.5V8h5M9 12.5h7M9 16h5" />
  </Icon>
);

export const IconBook = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 5.5c2.5-1 5-1 7.5.5v13c-2.5-1.5-5-1.5-7.5-.5zM19.5 5.5c-2.5-1-5-1-7.5.5v13c2.5-1.5 5-1.5 7.5-.5z" />
  </Icon>
);

export const IconLogout = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14" />
    <path d="M10 12h9.5M16 8.5l3.5 3.5-3.5 3.5" />
  </Icon>
);

export const IconUser = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 19.5c1-3.5 3.8-5.5 7-5.5s6 2 7 5.5" />
  </Icon>
);

export const IconChart = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 19.5h15M7.5 16v-5M12 16V7M16.5 16v-3" />
  </Icon>
);

export const IconTool = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
    <path d="M8.5 7.5h7M8.5 12h1M12 12h1M15.5 12h0M8.5 15.5h1M12 15.5h1M15.5 15.5h0" />
  </Icon>
);

export const IconCheckSquare = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </Icon>
);

export const IconCalendar = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
    <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
  </Icon>
);

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </Icon>
);

export const IconPencil = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14.5 5.5 18.5 9.5 9 19H5v-4z" />
    <path d="m12.5 7.5 4 4" />
  </Icon>
);

export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 7h14M10 4.5h4M7 7l.8 12a1.5 1.5 0 0 0 1.5 1.5h5.4a1.5 1.5 0 0 0 1.5-1.5L17 7" />
    <path d="M10.5 11v6M13.5 11v6" />
  </Icon>
);

export const IconBell = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </Icon>
);

export const IconPie = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5v8.5h8.5A8.5 8.5 0 1 1 12 3.5z" />
    <path d="M15 3.8A8.5 8.5 0 0 1 20.2 9H15z" />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

export const IconChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 9.5L12 15l5.5-5.5" />
  </Icon>
);

export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </Icon>
);

export const IconX = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 7l10 10M17 7L7 17" />
  </Icon>
);

export const IconCamera = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icon>
);

export const IconZoomIn = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="M15 15l4.5 4.5M8 10.5h5M10.5 8v5" />
  </Icon>
);

export const IconZoomOut = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="M15 15l4.5 4.5M8 10.5h5" />
  </Icon>
);

export const IconChat = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 18.5V7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v6a2.5 2.5 0 0 1-2.5 2.5H9z" />
    <path d="M9 9.5h6M9 12.5h4" />
  </Icon>
);

/** filled: 좋아요를 누른 상태(채운 하트) */
export const IconHeart = ({
  filled = false,
  ...p
}: IconProps & { filled?: boolean }) => (
  <Icon {...p}>
    <path
      d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 8.9 6c1.3 0 2.4.6 3.1 1.6A3.8 3.8 0 0 1 15.1 6 3.9 3.9 0 0 1 19 9.9c0 5.3-7 9.6-7 9.6z"
      fill={filled ? "currentColor" : "none"}
    />
  </Icon>
);

export const IconSend = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 12 19 5l-4.5 14-3-5.5z" />
    <path d="M11.5 13.5 19 5" />
  </Icon>
);

export const IconReply = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 7 5 11.5l5 4.5" />
    <path d="M5.5 11.5H14a5 5 0 0 1 5 5V18" />
  </Icon>
);

// ── 이모지 대신 쓰는 의미 아이콘 (같은 24px 선 스타일) ──

export const IconKey = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8.5" cy="14.5" r="3.5" />
    <path d="M11 12l7.5-7.5M16 7l2.5 2.5M14 9l2 2" />
  </Icon>
);

export const IconLock = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2" />
  </Icon>
);

export const IconUnlock = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 6.6-1.6M12 14.5v2" />
  </Icon>
);

export const IconBulb = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 17.5h6M10 20.5h4M12 3.5a5.5 5.5 0 0 0-3.3 9.9c.5.4.8 1 .8 1.6v.5h5v-.5c0-.6.3-1.2.8-1.6A5.5 5.5 0 0 0 12 3.5z" />
  </Icon>
);

export const IconUpload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 15V4.5M7.5 8.5 12 4l4.5 4.5" />
    <path d="M5 14v3.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V14" />
  </Icon>
);

export const IconDownload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4v10.5M7.5 10.5 12 15l4.5-4.5" />
    <path d="M5 14v3.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V14" />
  </Icon>
);

export const IconGradCap = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12 5 9 4.5-9 4.5-9-4.5z" />
    <path d="M7 11.5v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4M21 9.5V14" />
  </Icon>
);

export const IconAlert = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.3 4.6 3.4 16.8A2 2 0 0 0 5.1 19.8h13.8a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0z" />
    <path d="M12 9.5v4M12 16.5h.01" />
  </Icon>
);

export const IconClipboard = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5.5" y="5" width="13" height="15.5" rx="2.5" />
    <path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 11h6M9 14.5h4" />
  </Icon>
);

/** AI: 반짝이 별 셋 */
export const IconSparkles = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 4.5 11.4 9l4.6 1.5-4.6 1.4L10 16.5 8.6 12 4 10.5 8.6 9z" />
    <path d="M17.5 13.5l.7 2 2 .8-2 .7-.7 2-.7-2-2-.7 2-.8zM17 3.5l.5 1.5 1.5.5-1.5.5L17 7.5l-.5-1.5L15 5.5l1.5-.5z" />
  </Icon>
);

export const IconStethoscope = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3.5v5a4 4 0 0 0 8 0v-5" />
    <path d="M10 12.5v2a4.5 4.5 0 0 0 9 0v-1.5" />
    <circle cx="19" cy="11" r="2" />
  </Icon>
);

export const IconSchool = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 20h17M5 20V10l7-4.5 7 4.5v10" />
    <path d="M10 20v-4.5h4V20M12 5.5V2.5h3" />
  </Icon>
);

export const IconNotebook = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5.5" y="3.5" width="13" height="17" rx="2" />
    <path d="M9 3.5v17M12 8h3.5M12 11.5h3.5" />
  </Icon>
);

export const IconBackpack = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 10a6 6 0 0 1 12 0v8.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
    <path d="M9.5 4.6V4a2.5 2.5 0 0 1 5 0v.6M9 14h6v3H9z" />
  </Icon>
);

export const IconMail = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
    <path d="m4.5 7 7.5 6 7.5-6" />
  </Icon>
);

export const IconFlask = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.5 3.5h5M10 3.5v6l-5 8.4A1.8 1.8 0 0 0 6.6 20.5h10.8a1.8 1.8 0 0 0 1.6-2.6L14 9.5v-6" />
    <path d="M7.5 14.5h9" />
  </Icon>
);

export const IconBolt = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 3.5 5.5 13.5H12l-1 7 7.5-10H12z" />
  </Icon>
);

/** 체험(데모) 모드 */
export const IconPlayCircle = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M10.5 9v6l4.5-3z" />
  </Icon>
);

export const IconDrop = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z" />
    <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
  </Icon>
);

export const IconTimer = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="13.5" r="7" />
    <path d="M12 13.5V10M10 3.5h4M18 7l1.5-1.5" />
  </Icon>
);

export const IconSiren = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 18v-5a5 5 0 0 1 10 0v5M5 18h14v2.5H5zM12 3v2M4.5 6l1.4 1.4M19.5 6l-1.4 1.4" />
  </Icon>
);

export const IconHospital = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 20.5V6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v14M3 20.5h18" />
    <path d="M12 8v5M9.5 10.5h5M10 20.5v-3.5h4v3.5" />
  </Icon>
);

export const IconEye = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const IconThumbUp = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7.5 10.5v9H5a1.5 1.5 0 0 1-1.5-1.5v-6A1.5 1.5 0 0 1 5 10.5zM7.5 10.5l3.5-6.5a2 2 0 0 1 2 2.3l-.6 3.2h5.4a2 2 0 0 1 2 2.4l-1.3 6.3a2 2 0 0 1-2 1.8H7.5" />
  </Icon>
);

export const IconUndo = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 14 4.5 9.5 9 5" />
    <path d="M5 9.5h9.5a5 5 0 0 1 0 10H11" />
  </Icon>
);
