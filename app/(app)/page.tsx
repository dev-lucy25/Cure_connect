import { Suspense } from "react";
import { getOptionalUser, type CurrentUser } from "@/server/auth";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import { HomeSkeleton } from "@/components/ui/skeleton";
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

// 오픈형: 로그인 전엔 소개, 학생은 실습 시간 화면, 교수는 (준비 중) 안내
async function HomeContent() {
  const user = await getOptionalUser();
  if (!user) return <GuestHome />;
  if (user.role === "professor") return <ProfessorHome user={user} />;
  return <TrackerHome user={user} />;
}

function ProfessorHome({ user }: { user: CurrentUser }) {
  return (
    <div className="space-y-3">
      <PageHeader title="학생 현황" description={`${user.name} 교수님, 반가워요`} />
      <Card className="mt-2 flex flex-col items-center text-center">
        <NurseTurtle stage={4} size={104} decorative />
        <p className="mt-2 text-title font-bold">학생 현황 대시보드는 곧 열려요</p>
      </Card>
    </div>
  );
}
