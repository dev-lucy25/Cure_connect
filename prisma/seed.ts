// 시연용 가짜 계정 생성: `npm run db:seed`
// professor 계정은 이 스크립트로만 만들어진다 (화면에서는 역할을 고를 수 없음).
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "../generated/prisma/client";

// 모두 동의과학대(org_dit, 마이그레이션 20261029050000에서 생성) 소속, 방 코드 DIT-2026. 학교 + 학번으로도 로그인할 수 있다
type Account = { email: string; name: string; role: Role; memberNo: string; grade?: number; classGroup?: string; staffTitle?: string };
const ORG_ID = "org_dit";
const ROOM_CODE = "DIT-2026";
const accounts: Account[] = [
  { email: "prof@nursepass.test", name: "한교수", role: "professor", memberNo: "P2019001", staffTitle: "실습과장" },
  { email: "student1@nursepass.test", name: "김하늘", role: "student", memberNo: "20241042", grade: 3, classGroup: "B" },
  { email: "student2@nursepass.test", name: "이서연", role: "student", memberNo: "20241015", grade: 3, classGroup: "B" },
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
      const fields = { ...account, orgId: ORG_ID, roomCode: ROOM_CODE };
      await db.profile.upsert({ where: { id }, create: { id, ...fields }, update: fields });
    }
  } finally {
    await db.$disconnect();
  }
}

main();
