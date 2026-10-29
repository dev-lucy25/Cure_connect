import type { Metadata } from "next";
import { Suspense } from "react";
import { getOptionalUser } from "@/server/auth";
import { listNotifications } from "@/server/notification-repo";
import { timeAgoFromNow } from "@/lib/dates";
import LoginPrompt from "@/components/home/login-prompt";
import PageHeader from "@/components/ui/page-header";
import { NotificationsSkeleton } from "@/components/ui/skeleton";
import NotificationList from "@/components/notifications/notification-list";

export const metadata: Metadata = { title: "알림 · NursePass" };

export default function NotificationsPage() {
  return (
    <Suspense fallback={<NotificationsSkeleton />}>
      <NotificationsContent />
    </Suspense>
  );
}

// 학생·교수 공통 알림함 (최근 30개)
async function NotificationsContent() {
  const user = await getOptionalUser();
  if (!user) return <LoginPrompt title="로그인하고 알림을 확인해요" body="교수님의 독려·채점 결과·일지 인증 소식을 받아 볼 수 있어요" />;
  const items = (await listNotifications(user.id)).map(({ createdAt, ...n }) => ({ ...n, ago: timeAgoFromNow(createdAt) }));
  return (
    <div className="space-y-4">
      <PageHeader title="알림" description="최근 30개" />
      <NotificationList items={items} />
    </div>
  );
}
