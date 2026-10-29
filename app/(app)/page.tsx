import { Suspense } from "react";
import { getOptionalUser } from "@/server/auth";
import { HomeSkeleton, ProfessorHomeSkeleton } from "@/components/ui/skeleton";
import GuestHome from "@/components/home/guest-home";
import TrackerHome from "@/components/tracker/tracker-home";
import ProfessorHome from "@/components/prof/professor-home";

export default function Home() {
  return (
    // 로그인 정보는 요청마다 읽으므로 Suspense 안에서 스트리밍한다
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

// 오픈형: 로그인 전엔 소개, 학생은 실습 시간 화면, 교수는 학생 현황 대시보드
async function HomeContent() {
  const user = await getOptionalUser();
  if (!user) return <GuestHome />;
  if (user.role === "professor") {
    return (
      <Suspense fallback={<ProfessorHomeSkeleton />}>
        <ProfessorHome user={user} />
      </Suspense>
    );
  }
  return <TrackerHome user={user} />;
}
