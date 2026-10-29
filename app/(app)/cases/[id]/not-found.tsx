import Link from "next/link";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import { buttonClass } from "@/components/ui/button";
import Card from "@/components/ui/card";

export default function CaseNotFound() {
  return (
    <Card className="flex flex-col items-center text-center">
      <NurseTurtle stage={3} mood="empty" size={104} decorative />
      <h1 className="mt-2 text-title font-bold">케이스를 찾을 수 없어요</h1>
      <p className="mt-1 text-body-sm text-ink-soft">지워졌거나 내 케이스가 아니에요</p>
      <Link href="/cases" className={`${buttonClass("secondary", true)} mt-5`}>
        케이스 목록으로
      </Link>
    </Card>
  );
}
