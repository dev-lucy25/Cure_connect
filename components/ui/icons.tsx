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
