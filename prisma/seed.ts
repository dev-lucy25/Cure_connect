// 시연용 가짜 계정 + 케이스·족보 예시(seed-content.ts) + 체험 학생 실습 활동(seed-student.ts)
// + 같은 학교 학생들의 활동(seed-cohort.ts, 교수 화면·익명 통계용) 생성: `npm run db:seed`
// professor 계정은 이 스크립트로만 만들어진다 (화면에서는 역할을 고를 수 없음).
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "../generated/prisma/client";
import { seedDemoContent } from "./seed-content";
import { seedStudentActivity } from "./seed-student";
import { COHORT, seedCohortActivity } from "./seed-cohort";

// 모두 동의과학대(org_dit, 마이그레이션 20261029050000에서 생성) 소속. 학교 + 학번으로도 로그인할 수 있다
// 방 코드: 한교수 DIT-2026, 박지현 교수 DIT-2026A (학생은 둘 중 한 방)
type Account = {
  email: string;
  name: string;
  role: Role;
  memberNo: string;
  grade?: number;
  classGroup?: string;
  staffTitle?: string;
  roomCode?: string;
};
const ORG_ID = "org_dit";
const ROOM_CODE = "DIT-2026";
const accounts: Account[] = [
  { email: "prof@nursepass.test", name: "한교수", role: "professor", memberNo: "P2019001", staffTitle: "실습과장" },
  { email: "prof2@nursepass.test", name: "박지현", role: "professor", memberNo: "P2021014", staffTitle: "실습 지도교수", roomCode: "DIT-2026A" },
  { email: "student1@nursepass.test", name: "김하늘", role: "student", memberNo: "20241042", grade: 3, classGroup: "B" },
  { email: "student2@nursepass.test", name: "이서연", role: "student", memberNo: "20241015", grade: 3, classGroup: "B" },
  ...COHORT.map(({ track: _track, ...s }) => ({ ...s, role: "student" as const })),
];

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`.env에 ${name} 값이 필요합니다`);
  return value;
}

async function main() {
  const password = requireEnv("SEED_USER_PASSWORD");
  const supabase = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: requireEnv("DIRECT_URL") }) });

  try {
    const { data: existing, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw listError;

    const ids = new Map<string, string>();
    for (const account of accounts) {
      let id = existing.users.find((u) => u.email === account.email)?.id;
      if (!id) {
        const { data, error } = await supabase.auth.admin.createUser({
          email: account.email,
          password,
          email_confirm: true,
        });
        if (error) throw error;
        id = data.user.id;
      }
      const fields = { ...account, orgId: ORG_ID, roomCode: account.roomCode ?? ROOM_CODE };
      await db.profile.upsert({ where: { id }, create: { id, ...fields }, update: fields, select: { id: true } });
      ids.set(account.email, id);
    }
    const prof = { profId: ids.get("prof@nursepass.test")!, profName: "한교수", orgId: ORG_ID };
    // 케이스는 체험 학생(김하늘), 족보는 다른 학생(이서연)이 쓴 것으로 → 체험 계정이 크레딧으로 열어 볼 수 있다
    await seedDemoContent(db, { caseOwner: ids.get("student1@nursepass.test")!, noteAuthor: ids.get("student2@nursepass.test")! });
    // 케이스가 있어야 과제 제출을 만들 수 있으므로 케이스 다음에
    await seedStudentActivity(db, { studentId: ids.get("student1@nursepass.test")!, ...prof });
    // 이서연 + 같은 학교 학생들 (족보가 있어야 열람·평점을 만들 수 있으므로 족보 다음에)
    await seedCohortActivity(db, {
      students: ["student2@nursepass.test", ...COHORT.map((s) => s.email)].map((email) => ids.get(email)!),
      tracks: ["normal", ...COHORT.map((s) => s.track)],
      ...prof,
    });
  } finally {
    await db.$disconnect();
  }
}

main();
