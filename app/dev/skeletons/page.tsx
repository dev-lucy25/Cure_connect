import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CaseDetailSkeleton, CasesSkeleton, HomeSkeleton, LogsMoreSkeleton, MeSkeleton } from "@/components/ui/skeleton";

// 개발 모드 전용 스켈레톤 미리보기 (?v=home|cases|case|me|logs). 배포(production)에서는 404.
const VIEWS = { home: HomeSkeleton, cases: CasesSkeleton, case: CaseDetailSkeleton, me: MeSkeleton, logs: LogsMoreSkeleton };

export default function SkeletonPreview({ searchParams }: PageProps<"/dev/skeletons">) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto w-full max-w-(--width-app) px-5 py-5 md:max-w-(--width-wide) md:px-8 md:py-8">
      {/* 주소의 ?v=는 요청마다 읽으므로 Suspense 안에서 */}
      <Suspense>
        <Preview searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Preview({ searchParams }: Pick<PageProps<"/dev/skeletons">, "searchParams">) {
  const { v } = await searchParams;
  const View = VIEWS[(typeof v === "string" ? v : "home") as keyof typeof VIEWS] ?? HomeSkeleton;
  return <View />;
}
