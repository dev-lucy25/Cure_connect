import { Suspense } from "react";
import { getOptionalUser, type CurrentUser } from "@/server/auth";
import { logout } from "@/server/auth-actions";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import GuestHome from "@/components/home/guest-home";
import TrackerHome from "@/components/tracker/tracker-home";

export default function Home() {
  return (
    // 로그인 정보는 요청마다 읽으므로 Suspense 안에서 스트리밍한다
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

// 오픈형: 로그인 전엔 소개, 학생은 트래커, 교수는 (준비 중) 안내
async function HomeContent() {
  const user = await getOptionalUser();
  if (!user) return <GuestHome />;
  if (user.role === "professor") return <ProfessorHome user={user} />;
  return <TrackerHome user={user} />;
}

function ProfessorHome({ user }: { user: CurrentUser }) {
  return (
    <Card className="flex flex-col items-center text-center">
      <NurseTurtle stage={4} size={120} decorative />
      <Badge tone="pink">교수</Badge>
      <h1 className="mt-3 font-display text-headline">{user.name}님, 반가워요</h1>
      <p className="mt-1 text-body-sm text-ink-soft">학생 현황 대시보드는 곧 열려요</p>
      <form action={logout} className="mt-6 w-full">
        <Button type="submit" variant="ghost" block>
          로그아웃
        </Button>
      </form>
    </Card>
  );
}

function HomeSkeleton() {
  return (
    <div aria-busy aria-label="불러오는 중" className="space-y-6">
      <Card className="flex items-center gap-3">
        <NurseTurtle stage={2} mood="loading" size={96} />
        <div className="flex-1 space-y-2">
          <div className="h-10 w-3/4 animate-pulse rounded-control bg-cream-deep" />
          <div className="h-5 w-1/2 animate-pulse rounded-control bg-cream-deep" />
        </div>
      </Card>
      <div className="h-24 animate-pulse rounded-card bg-cream-deep" />
      <div className="h-32 animate-pulse rounded-card bg-cream-deep" />
    </div>
  );
}
