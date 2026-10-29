// 체험(데모) 계정: 시드로 만드는 가짜 계정 (prisma/seed.ts). 실제 사람 정보 아님
export const DEMO_ACCOUNTS = {
  student: { email: "student1@nursepass.test", label: "👩‍⚕️ 학생으로 체험", who: "김하늘 학생 · 동의과학대 3학년" },
  professor: { email: "prof@nursepass.test", label: "👨‍🏫 교수로 체험", who: "한교수 · 실습과장" },
} as const;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;

export const isDemoEmail = (email: string) => Object.values(DEMO_ACCOUNTS).some((a) => a.email === email);
