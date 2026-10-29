import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/server/auth";
import { AI_DAILY_LIMIT, getAiUsedToday, getCase } from "@/server/case-repo";
import { idSchema } from "@/lib/validation/form";
import CaseAiPanel from "@/components/cases/case-ai-panel";
import CaseEditor from "@/components/cases/case-editor";
import { SkeletonCard, WalkingTurtle } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "케이스 · NursePass" };

export default function CaseDetailPage({ params }: PageProps<"/cases/[id]">) {
  return (
    <div className="space-y-3">
      <Link href="/cases" className="inline-flex min-h-11 items-center text-body-sm font-bold text-ink-soft hover:text-ink">
        ← 케이스 목록
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <CaseDetail params={params} />
      </Suspense>
    </div>
  );
}

async function CaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 로그인 확인 → 내 케이스만. 남의 케이스나 없는 id는 똑같이 404로 보여 존재 여부도 알리지 않는다
  const user = await getCurrentUser();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) notFound();
  const [found, usedToday] = await Promise.all([getCase(user.id, parsed.data), getAiUsedToday(user.id)]);
  if (!found) notFound();

  return (
    <div className="space-y-3">
      <CaseEditor initial={{ id: found.id, title: found.title, ward: found.ward, memo: found.memo }} />
      <CaseAiPanel caseId={found.id} ai={found.ai} stale={found.stale} usedToday={usedToday} limit={AI_DAILY_LIMIT} />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy className="space-y-3">
      <SkeletonCard lines={4} tall />
      <WalkingTurtle />
      <SkeletonCard lines={3} />
    </div>
  );
}
