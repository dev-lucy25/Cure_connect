import Link from "next/link";
import type { ScheduleItem } from "@/server/practice-repo";
import { dDayLabel, daysBetween, shortDate } from "@/lib/dates";
import { shiftLabel, subjectLabel } from "@/lib/subjects";
import { buttonClass } from "@/components/ui/button";
import Card from "@/components/ui/card";
import Chip from "@/components/ui/chip";

// 가장 가까운 실습(진행 중이면 그것)의 병동 정보 카드: D-Day · 기간 · 근무 시간 · 집결 · 수간호사 · 다빈도 질환 · 조원
// 선배 족보 바로가기 버튼은 족보 화면(P4)과 함께 붙인다.
export default function NextPracticeCard({ schedule, today }: { schedule: ScheduleItem; today: string }) {
  const untilStart = daysBetween(today, schedule.startDate);
  const ongoing = untilStart <= 0 && (schedule.endDate ? schedule.endDate >= today : untilStart === 0);
  const period = schedule.endDate ? `${shortDate(schedule.startDate)} ~ ${shortDate(schedule.endDate)}` : shortDate(schedule.startDate);
  const shiftTime = [schedule.shiftStart, schedule.shiftEnd].filter(Boolean).join(" ~ ");
  const team = [schedule.teammates.join(", "), schedule.groupName && `(${schedule.groupName})`].filter(Boolean).join(" ");

  const rows = [
    { label: "담당 수간호사", value: schedule.preceptor },
    { label: "주요 다빈도 질환", value: schedule.commonDiseases.join(", ") || null },
    { label: "실습 조원", value: team || null },
  ].filter((r) => r.value);

  return (
    <Card className="bg-brand-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Chip tone={ongoing ? "pink" : "warn"}>
          {ongoing ? `실습 중 · ${1 - untilStart}일차` : `📅 다음 실습 ${dDayLabel(untilStart)}`}
        </Chip>
        <span className="text-body-sm text-ink-soft">{period}</span>
      </div>
      <h2 className="mt-3 text-title font-bold text-ink">
        {schedule.hospital} {schedule.ward}
        {schedule.department && <span className="font-medium text-ink-soft"> ({schedule.department})</span>}
      </h2>
      {schedule.subject && <p className="mt-0.5 text-body-sm font-bold text-brand-deep">{subjectLabel(schedule.subject)}실습</p>}
      {(schedule.shift || shiftTime || schedule.meetingPlace) && (
        <p className="mt-1 text-body-sm text-ink">
          {[
            (schedule.shift || shiftTime) && `${schedule.shift ? `${shiftLabel(schedule.shift)} 근무` : "근무"}${shiftTime ? ` (${shiftTime})` : ""}`,
            schedule.meetingPlace && `집결: ${schedule.meetingPlace}${schedule.meetingTime ? ` ${schedule.meetingTime}` : ""}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {rows.length > 0 && (
        <dl className="mt-3 space-y-1.5 rounded-control bg-surface p-3 text-body-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-3">
              <dt className="shrink-0 text-ink-soft">{r.label}</dt>
              <dd className="text-right font-bold text-ink">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-4 flex gap-2">
        <Link href="/cases" className={`${buttonClass("primary")} flex-1 text-body-sm`}>
          🤖 케이스 준비
        </Link>
      </div>
    </Card>
  );
}
