import Link from "next/link";
import type { CurrentUser } from "@/server/auth";
import type { ScheduleItem } from "@/server/practice-repo";
import { subjectLabel } from "@/lib/subjects";
import Card from "@/components/ui/card";
import Chip from "@/components/ui/chip";

// 학생 홈 맨 위: 이름 · 학년반 · 학번 · 이수 상태 · 학교 · 현재 로테이션(오늘이 기간 안인 실습 일정)
export default function ProfileBanner({
  user,
  totalMinutes,
  goalHours,
  current,
}: {
  user: CurrentUser;
  totalMinutes: number;
  goalHours: number;
  current?: ScheduleItem;
}) {
  const rotation = current && `${current.subject ? `${subjectLabel(current.subject)}실습 · ` : ""}${current.ward}`;
  const done = totalMinutes >= goalHours * 60;
  const classLabel = [user.grade && `${user.grade}학년`, user.classGroup && `${user.classGroup}반`].filter(Boolean).join(" ");
  const idLine = [classLabel, user.memberNo].filter(Boolean).join(" · ");

  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-title font-bold text-ink">
            {user.name} 학생{idLine && <span className="ml-1 text-body-sm font-medium text-ink-soft">({idLine})</span>}
          </h2>
          {done ? <Chip tone="pink">🎓 {goalHours.toLocaleString()}시간 달성</Chip> : <Chip>실습 정상 이수중</Chip>}
        </div>
        <p className="mt-1 text-body-sm text-ink-soft">
          {user.orgName ?? (
            <>
              학교 미연결 ·{" "}
              <Link href="/me" className="font-bold text-brand-deep underline underline-offset-2">
                내 정보에서 학교 연결하기
              </Link>
            </>
          )}
          {rotation && <> · 현재 로테이션: {rotation}</>}
        </p>
      </div>
    </Card>
  );
}
