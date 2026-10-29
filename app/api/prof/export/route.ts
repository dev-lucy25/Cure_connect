import { getOptionalUser } from "@/server/auth";
import { rosterCsv } from "@/server/professor-repo";

// 간호교육인증평가 제출용 실습대장 CSV. 교수만, 볼 수 있는 학생(같은 학교·같은 방)만 담는다.
export async function GET() {
  const user = await getOptionalUser();
  if (!user) return new Response("로그인이 필요해요", { status: 401 });
  if (user.role !== "professor") return new Response("교수 계정만 받을 수 있어요", { status: 403 });
  const csv = await rosterCsv(user);
  const filename = encodeURIComponent("NursePass_간호교육인증평가_1000시간_실습대장.csv");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nursepass_roster.csv"; filename*=UTF-8''${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
