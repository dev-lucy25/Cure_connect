import type { Metadata } from "next";
import { Suspense } from "react";
import { getOptionalUser } from "@/server/auth";
import { getCredits, listNotes, uploadRewardLeft, type NoteFilter } from "@/server/notes-repo";
import { NOTE_CATEGORY_KEYS } from "@/lib/credits";
import PageHeader from "@/components/ui/page-header";
import { NotesSkeleton } from "@/components/ui/skeleton";
import NotesMarket from "@/components/notes/notes-market";

export const metadata: Metadata = { title: "선배 병동 족보 · NursePass" };

export default function NotesPage({ searchParams }: PageProps<"/notes">) {
  return (
    <Suspense fallback={<NotesSkeleton />}>
      <NotesContent searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

// 오픈형: 로그인 전에도 제목·맛보기는 보이고, 시크릿은 작성자·열람자·무료일 때만 서버가 보낸다
async function NotesContent({ searchParams }: Pick<PageProps<"/notes">, "searchParams">) {
  const sp = await searchParams;
  const category = one(sp.category);
  const ward = one(sp.ward)?.trim();
  const filter: NoteFilter = {
    category: NOTE_CATEGORY_KEYS.find((k) => k === category),
    ward: ward && ward.length <= 60 ? ward : undefined,
    sort: one(sp.sort) === "popular" ? "popular" : "new",
  };
  const user = await getOptionalUser();
  const student = user?.role === "student";
  const [page, credits, rewardAvailable] = await Promise.all([
    listNotes(user?.id ?? null, filter),
    student ? getCredits(user.id) : Promise.resolve(null),
    student ? uploadRewardLeft(user.id) : Promise.resolve(false),
  ]);

  return (
    <div className="space-y-3">
      <PageHeader title="선배 병동 족보" description="병동별 수간호사님 질문·준비물·분위기·꿀팁" />
      <div className="pt-2">
        <NotesMarket
          items={page.items}
          nextCursor={page.nextCursor}
          filter={filter}
          credits={credits}
          canWrite={student}
          rewardAvailable={rewardAvailable}
          startWriting={one(sp.write) === "1"}
        />
      </div>
    </div>
  );
}
