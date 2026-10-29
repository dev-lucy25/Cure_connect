import type { Metadata } from "next";
import { Suspense } from "react";
import { getOptionalUser } from "@/server/auth";
import { listCases } from "@/server/case-repo";
import LoginPrompt from "@/components/home/login-prompt";
import CaseList from "@/components/cases/case-list";
import { PageSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "케이스 메모 · NursePass" };

export default function CasesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CasesContent />
    </Suspense>
  );
}

async function CasesContent() {
  const user = await getOptionalUser();
  if (!user) {
    return <LoginPrompt title="로그인하고 케이스를 기록해요" body="메모는 나만 볼 수 있고, AI로 SOAPIE 초안을 만들 수 있어요" />;
  }
  if (user.role !== "student") {
    return <LoginPrompt title="학생 계정 전용 화면이에요" body="교수 계정은 학생 현황 화면을 이용해 주세요" />;
  }
  const { items, nextCursor } = await listCases(user.id);
  return <CaseList items={items} nextCursor={nextCursor} />;
}

