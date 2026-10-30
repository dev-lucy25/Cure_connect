import Link from "next/link";
import type { CurrentUser } from "@/server/auth";
import type { ScheduleItem } from "@/server/practice-repo";
import { subjectLabel } from "@/lib/subjects";
import Card from "@/components/ui/card";
import Chip from "@/components/ui/chip";
import { STATUS_TEXT, practiceStatus } from "@/lib/practice-status";
import { IconKey } from "@/components/ui/icons";

// 학생 홈 맨 위: 이름 · 학년반 · 학번 · 이수 상태 · 학교 · 현재 로테이션(오늘이 기간 안인 실습 일정)
// 이수 상태는 교수 현황판과 같은 기준(졸업 1,000시간, 500시간 미만 위험) — lib/practice-status.ts
export default function ProfileBanner({
  user,
  totalMinutes,
  current,
  professors,
}: {
  user: CurrentUser;
  totalMinutes: number;
  current?: ScheduleItem;
  /** 내 기록을 볼 수 있는 교수님 (같은 학교·같은 방) */
  professors: string[];
}) {
  const rotation =
    current &&
    `${current.subject ? `${subjectLabel(current.subject)}실습 · ` : ""}${current.ward}`;
  const status = STATUS_TEXT[practiceStatus(totalMinutes / 60)];
  const classLabel = [
    user.grade && `${user.grade}학년`,
    user.classGroup && `${user.classGroup}반`,
  ]
    .filter(Boolean)
    .join(" ");
  const idLine = [classLabel, user.memberNo].filter(Boolean).join(" · ");

  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-title font-bold text-ink">
            {user.name} 학생
            {idLine && (
              <span className="ml-1 text-body-sm font-medium text-ink-soft">
                ({idLine})
              </span>
            )}
          </h2>
          <Chip tone={status.tone}>{status.label}</Chip>
          {user.roomCode && (
            <Chip tone="neutral" className="text-caption">
              <IconKey size={15} className="mr-1 inline align-[-0.2em]" />방
              코드: {user.roomCode}
            </Chip>
          )}
        </div>
        <p className="mt-1 text-body-sm text-ink-soft">
          {user.orgName ?? (
            <>
              학교 미연결 ·{" "}
              <Link
                href="/me"
                className="font-bold text-brand-deep underline underline-offset-2"
              >
                내 정보에서 학교 연결하기
              </Link>
            </>
          )}
          {rotation && <> · 현재 로테이션: {rotation}</>}
        </p>
        <p
          className="mt-0.5 text-body-sm text-ink-soft"
          data-connected-professors
        >
          {professors.length > 0 ? (
            <>
              <span
                aria-hidden
                className="mr-1.5 inline-block size-2 rounded-full bg-brand-deep align-middle"
              />
              교수님 현황판 연결됨 · {professors.join(", ")} 교수님
            </>
          ) : (
            <>
              <span
                aria-hidden
                className="mr-1.5 inline-block size-2 rounded-full bg-line-strong align-middle"
              />
              아직 연결된 교수님이 없어요 ·{" "}
              <Link
                href="/me"
                className="font-bold text-brand-deep underline underline-offset-2"
              >
                학교나 방 코드 연결하기
              </Link>
            </>
          )}
        </p>
      </div>
    </Card>
  );
}
