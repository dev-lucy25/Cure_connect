import Link from "next/link";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import { buttonClass } from "@/components/ui/button-class";
import Card from "@/components/ui/card";

// 로그인은 했지만 역할이 다른 화면에 들어왔을 때 (예: 교수가 학생 전용 화면). 로그인 버튼 대신 내 홈으로 안내
export default function RoleNotice({
  title,
  body,
  href = "/",
  action = "학생 현황으로 가기",
}: {
  title: string;
  body: string;
  href?: string;
  action?: string;
}) {
  return (
    <Card className="flex flex-col items-center text-center" data-role-notice>
      <NurseTurtle stage={2} size={104} decorative />
      <h1 className="mt-2 text-title font-bold">{title}</h1>
      <p className="mt-1 text-body-sm text-ink-soft">{body}</p>
      <Link href={href} className={`${buttonClass("primary", true)} mt-5`}>
        {action}
      </Link>
    </Card>
  );
}
