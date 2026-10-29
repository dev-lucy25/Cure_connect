import type { CurrentUser } from "@/server/auth";
import { listRoster, professorKpis, RISK_HOURS } from "@/server/professor-repo";
import Card from "@/components/ui/card";
import Chip from "@/components/ui/chip";
import PageHeader from "@/components/ui/page-header";
import AnimatedNumber from "@/components/motion/animated-number";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import RoomCodeEditor from "@/components/prof/room-code-editor";
import Roster from "@/components/prof/roster";

// 교수 홈(학생 현황): 교수 정보 + 방 코드 → KPI 4개 → 학생 현황판(필터·CSV)
// 보이는 학생 = 같은 학교 또는 내 방 코드로 들어온 학생
export default async function ProfessorHome({ user }: { user: CurrentUser }) {
  const [kpis, roster] = await Promise.all([professorKpis(user), listRoster(user, "ALL")]);
  const kpiItems = [
    { label: "매칭된 학생", value: kpis.matched, suffix: "명", tone: "text-ink" },
    { label: "평균 1,000시간 달성률", value: kpis.avgPercent, suffix: "%", tone: "text-brand-deep" },
    { label: `위험군 (${RISK_HOURS}시간 미만)`, value: kpis.risk, suffix: "명", tone: kpis.risk > 0 ? "text-warn-ink" : "text-ink" },
    {
      label: "채점 대기 과제",
      value: kpis.pendingSubmissions,
      suffix: "건",
      tone: kpis.pendingSubmissions > 0 ? "text-pink-deep" : "text-ink",
    },
  ];

  return (
    <Stagger className="space-y-3">
      <PageHeader title="학생 현황" description={`${user.name} 교수님, 반가워요`} />
      <StaggerItem className="pt-2">
        <Card className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-title font-bold text-ink">
                {user.name} 교수님
                {user.staffTitle && <span className="ml-1 text-body-sm font-medium text-ink-soft">({user.staffTitle})</span>}
              </h2>
              <Chip tone={user.orgName ? "brand" : "neutral"}>{user.orgName ? "🏫 학교 연결됨" : "학교 미연결"}</Chip>
            </div>
            <p className="mt-1 text-body-sm text-ink-soft">{user.orgName ?? "같은 방 코드로 들어온 학생만 보여요"}</p>
          </div>
          <RoomCodeEditor roomCode={user.roomCode} />
        </Card>
      </StaggerItem>

      <StaggerItem>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpiItems.map((k) => (
            <li key={k.label} className="rounded-card border border-line bg-surface p-4 shadow-soft">
              <p className="text-caption font-bold text-ink-soft">{k.label}</p>
              <p className="mt-1 font-display text-display leading-none">
                <AnimatedNumber value={k.value} suffix={k.suffix} className={k.tone} />
              </p>
            </li>
          ))}
        </ul>
      </StaggerItem>

      <StaggerItem>
        <Roster rows={roster} hasRoom={Boolean(user.roomCode)} />
      </StaggerItem>
    </Stagger>
  );
}
