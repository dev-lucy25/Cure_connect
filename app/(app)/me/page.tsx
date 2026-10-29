import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getOptionalUser } from "@/server/auth";
import { logout } from "@/server/auth-actions";
import { listOrganizations } from "@/server/org-repo";
import { getActivitySummary } from "@/server/activity-repo";
import ActivitySummary from "@/components/me/activity-summary";
import StatsConsent from "@/components/me/stats-consent";
import { getStatsOptOut } from "@/server/insights-repo";
import LoginPrompt from "@/components/home/login-prompt";
import { ProfessorUpgradeForm, ProfileForm } from "@/components/me/profile-forms";
import Button from "@/components/ui/button";
import { buttonClass } from "@/components/ui/button-class";
import Card from "@/components/ui/card";
import { IconLogout } from "@/components/ui/icons";
import PageHeader from "@/components/ui/page-header";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { MeSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "내 정보 · NursePass" };

export default function MePage() {
  return (
    <Suspense fallback={<MeSkeleton />}>
      <MeContent />
    </Suspense>
  );
}

// 모바일: 카드 세로로. md 이상: 왼쪽 프로필 / 오른쪽 계정·교수 인증
async function MeContent() {
  const user = await getOptionalUser();
  if (!user) return <LoginPrompt title="로그인하고 내 정보를 관리해요" body="학교와 학번을 연결하면 학번으로도 로그인할 수 있어요" />;
  const student = user.role === "student";
  const [orgs, summary, optOut] = await Promise.all([
    listOrganizations(),
    student ? getActivitySummary(user.id) : null,
    student ? getStatsOptOut(user.id) : false,
  ]);

  return (
    <Stagger className="space-y-3">
      <PageHeader title="내 정보" description={`${user.email} · ${user.role === "professor" ? "교수·조교" : "학생"} 계정`} />
      <div className="grid gap-4 pt-2 md:grid-cols-2 md:items-start">
        <StaggerItem>
          <Card>
            <h2 className="mb-4 text-title font-bold text-ink">프로필</h2>
            <ProfileForm user={user} orgs={orgs} />
          </Card>
        </StaggerItem>
        <StaggerItem className="space-y-4">
          {summary && <ActivitySummary summary={summary} />}
          {student && <StatsConsent included={!optOut} />}
          <Card>
            <h2 className="mb-3 text-title font-bold text-ink">계정</h2>
            <div className="space-y-2">
              <Link href="/reset-password/update" className={buttonClass("secondary", true)}>
                비밀번호 바꾸기
              </Link>
              <form action={logout}>
                <Button type="submit" variant="ghost" block>
                  <IconLogout size={18} /> 로그아웃
                </Button>
              </form>
            </div>
          </Card>
          {user.role === "student" && (
            <Card>
              <h2 className="text-title font-bold text-ink">교수·조교 인증</h2>
              <p className="mt-1 mb-4 text-body-sm text-ink-soft">
                학과 사무실에서 받은 학교 초대 코드가 있으면 교수·조교 계정으로 바꿀 수 있어요.
              </p>
              <ProfessorUpgradeForm orgs={orgs} />
            </Card>
          )}
        </StaggerItem>
      </div>
    </Stagger>
  );
}
