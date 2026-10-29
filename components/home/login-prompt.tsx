import Link from "next/link";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import { buttonClass } from "@/components/ui/button-class";
import Card from "@/components/ui/card";

// 오픈형: 로그인이 필요한 화면에 비로그인으로 들어왔을 때
export default function LoginPrompt({ title, body }: { title: string; body: string }) {
  return (
    <Card className="flex flex-col items-center text-center">
      <NurseTurtle stage={2} size={104} decorative />
      <h1 className="mt-2 text-title font-bold">{title}</h1>
      <p className="mt-1 text-body-sm text-ink-soft">{body}</p>
      <Link href="/login" className={`${buttonClass("primary", true)} mt-5`}>
        로그인하기
      </Link>
    </Card>
  );
}
