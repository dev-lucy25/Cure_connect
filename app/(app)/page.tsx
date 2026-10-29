import { Suspense } from "react";
import { getCurrentUser } from "@/server/auth";
import { logout } from "@/server/auth-actions";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";

export default function Home() {
  return (
    // 로그인 정보는 요청마다 읽으므로 Suspense 안에서 스트리밍한다
    <Suspense fallback={<HomeSkeleton />}>
      <Welcome />
    </Suspense>
  );
}

async function Welcome() {
  const user = await getCurrentUser();

  return (
    <Card className="flex flex-col items-center text-center">
      <NurseTurtle stage={2} size={120} decorative />
      <Badge tone={user.role === "professor" ? "pink" : "mint"}>{user.role === "professor" ? "교수" : "학생"}</Badge>
      <h1 className="mt-3 font-display text-headline">{user.name}님, 반가워요</h1>
      <p className="mt-1 text-body-sm text-ink-soft">{user.email}</p>
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
    <Card aria-busy className="flex flex-col items-center">
      <NurseTurtle stage={2} mood="loading" size={120} />
      <div className="mt-3 h-6 w-12 animate-pulse rounded-full bg-cream-deep" />
      <div className="mt-3 h-8 w-3/4 animate-pulse rounded-control bg-cream-deep" />
      <div className="mt-6 h-12 w-full animate-pulse rounded-control bg-cream-deep" />
    </Card>
  );
}
