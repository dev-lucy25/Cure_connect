// 시연용 가짜 계정 생성: `npm run db:seed`
// professor 계정은 이 스크립트로만 만들어진다 (화면에서는 역할을 고를 수 없음).
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "../generated/prisma/client";

const accounts: { email: string; name: string; role: Role }[] = [
  { email: "prof@nursepass.test", name: "한교수", role: "professor" },
  { email: "student1@nursepass.test", name: "김하늘", role: "student" },
  { email: "student2@nursepass.test", name: "이서연", role: "student" },
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
      await db.profile.upsert({
        where: { id },
        create: { id, ...account },
        update: { name: account.name, role: account.role },
      });
    }
  } finally {
    await db.$disconnect();
  }
}

main();
