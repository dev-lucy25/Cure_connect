import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getOptionalUser } from "@/server/auth";
import { getInsights, K_MIN, type InsightPeriod, type InsightScope } from "@/server/insights-repo";
import { SKILLS } from "@/lib/skills";
import LoginPrompt from "@/components/home/login-prompt";
import RoleNotice from "@/components/home/role-notice";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import { InsightsSkeleton } from "@/components/ui/skeleton";
import { BarList, Heatmap, HIDDEN_NOTE, WeeklyLine } from "@/components/prof/insights-charts";

export const metadata: Metadata = { title: "익명 통계 · NursePass" };

const PERIODS: { key: InsightPeriod; label: string }[] = [
  { key: "4w", label: "최근 4주" },
  { key: "term", label: "이번 학기(16주)" },
  { key: "all", label: "전체" },
];
const SCOPES: { key: InsightScope; label: string }[] = [
  { key: "all", label: "학교·실습반 전체" },
  { key: "room", label: "내 실습반만" },
];

export default function InsightsPage({ searchParams }: PageProps<"/prof/insights">) {
  return (
    <Suspense fallback={<InsightsSkeleton />}>
      <InsightsContent searchParams={searchParams} />
    </Suspense>
  );
}

// 익명 통계: 학생들이 어떤 병동·어떤 술기를 어려워하는지 (5명 미만 칸은 숨김, 개인 기록 없음)
async function InsightsContent({ searchParams }: Pick<PageProps<"/prof/insights">, "searchParams">) {
  const user = await getOptionalUser();
  if (!user)
    return <LoginPrompt title="로그인하고 실습 통계를 봐요" body="교수 계정으로 로그인하면 학생들이 어려워하는 병동·술기를 볼 수 있어요" />;
  if (user.role !== "professor")
    return <RoleNotice title="교수 계정 전용 화면이에요" body="내 기록은 실습 홈에서 볼 수 있어요" href="/" action="실습 홈으로" />;
  const sp = await searchParams;
  const period = (PERIODS.find((p) => p.key === sp.period)?.key ?? "term") as InsightPeriod;
  if (!user.orgId && !user.roomCode)
    return (
      <RoleNotice
        title="연결된 학생이 아직 없어요"
        body="학교를 연결하거나 실습반 방 코드를 학생들에게 알려 주면, 학생들의 익명 통계가 여기에 모여요"
        href="/"
        action="방 코드 확인하러 가기"
      />
    );
  const data = await getInsights(user, period, sp.scope === "room" ? "room" : "all");
  const scope = data.scope;
  const href = (change: { period?: string; scope?: string }) => {
    const q = new URLSearchParams({ period, scope, ...change });
    return `/prof/insights?${q}`;
  };
  // 정확한 인원·건수는 빼기 계산으로 개인을 드러낼 수 있어 구간으로만 보여준다
  const tiles = [
    { label: "통계 대상 학생", value: data.students },
    { label: "난이도·술기를 남긴 학생", value: data.respondents },
    { label: "공개 기준", value: `${K_MIN}명 이상 칸만` },
  ];

  return (
    <Stagger className="space-y-4">
      <PageHeader title="익명 통계" description={`이름 없이 묶음으로만 보여요 · 학생 ${K_MIN}명 미만인 칸은 숨겨요`} />

      {/* 필터: 한 줄 (기간 · 범위) */}
      <StaggerItem className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
        <Pills label="기간" items={PERIODS.map((p) => ({ label: p.label, href: href({ period: p.key }), active: p.key === period }))} />
        {data.roomScopeOk && (
          <Pills label="범위" items={SCOPES.map((s) => ({ label: s.label, href: href({ scope: s.key }), active: s.key === scope }))} />
        )}
      </StaggerItem>

      <StaggerItem>
        <ul className="grid grid-cols-3 gap-3">
          {tiles.map((t) => (
            <li key={t.label} className="rounded-card border border-line bg-surface p-4 shadow-soft">
              <p className="text-caption font-bold text-ink-soft">{t.label}</p>
              <p className="mt-1 font-display text-title text-ink md:text-headline">{t.value}</p>
            </li>
          ))}
        </ul>
      </StaggerItem>

      {data.fewRespondents && (
        <StaggerItem>
          <p className="rounded-card border border-warn-line bg-warn-bg px-4 py-3 text-body-sm text-warn-ink">
            아직 난이도·술기를 남긴 학생이 {K_MIN}명 미만이라 대부분 숨겨져 있어요. 학생들이 일지의 &ldquo;오늘 어땠나요?&rdquo;를 남기면
            채워져요.
          </p>
        </StaggerItem>
      )}

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <StaggerItem>
          <Card>
            <h2 className="text-title font-bold">병동별 평균 난이도</h2>
            <p className="mb-3 text-body-sm text-ink-soft">1(아주 쉬움) ~ 5(아주 어려움)</p>
            <BarList
              caption="병동별 평균 난이도"
              max={5}
              unit="level"
              items={data.byWard.map((w) => ({ key: w.key, label: w.label, cell: w.avg }))}
            />
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <h2 className="text-title font-bold">어려웠던 술기 Top</h2>
            <p className="mb-3 text-body-sm text-ink-soft">술기를 고른 일지 중 그 술기를 어렵다고 고른 비율</p>
            <BarList
              caption="어려웠던 술기 비율"
              max={100}
              unit="percent"
              items={data.skills.slice(0, 10).map((s) => ({ key: s.key, label: s.label, cell: s.share }))}
            />
          </Card>
        </StaggerItem>
      </div>

      <StaggerItem>
        <Card>
          <h2 className="text-title font-bold">병동 × 술기</h2>
          <p className="mb-3 text-body-sm text-ink-soft">어느 병동에서 어떤 술기가 막히는지</p>
          {data.heatmap.length ? (
            <Heatmap rows={data.heatmap} skills={SKILLS.map((s) => ({ key: s.key, label: s.label }))} />
          ) : (
            <p className="text-body-sm text-ink-soft">{HIDDEN_NOTE}</p>
          )}
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card>
          <h2 className="text-title font-bold">주별 평균 난이도 (최근 {data.weekly.length}주)</h2>
          <WeeklyLine points={data.weekly} />
        </Card>
      </StaggerItem>

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <StaggerItem>
          <Card>
            <h2 className="text-title font-bold">AI 프리셉터 모의질문 평균 점수</h2>
            <p className="mb-3 text-body-sm text-ink-soft">병동별 (100점 만점)</p>
            <BarList
              caption="병동별 모의질문 평균 점수"
              max={100}
              unit="score"
              items={data.preceptorByWard.map((w) => ({ key: w.key, label: w.label, cell: w.avg }))}
            />
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <h2 className="text-title font-bold">학생들이 가장 어려워한 질문</h2>
            {data.hardestQuestions.length ? (
              <ol className="mt-3 space-y-2">
                {data.hardestQuestions.map((q, i) => (
                  <li key={q.key} className="rounded-control bg-subtle px-3 py-2 text-body-sm">
                    <span className="font-bold text-ink">
                      {i + 1}. 평균 {q.avg}점
                    </span>
                    <span className="ml-1 text-caption text-ink-soft">({q.band})</span>
                    <p className="mt-0.5 text-ink">{q.question}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-body-sm text-ink-soft">{HIDDEN_NOTE}</p>
            )}
          </Card>
        </StaggerItem>
      </div>
    </Stagger>
  );
}

function Pills({ label, items }: { label: string; items: { label: string; href: string; active: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      <span className="text-caption font-bold text-ink-soft">{label}</span>
      {items.map((i) => (
        <Link
          key={i.label}
          href={i.href}
          scroll={false}
          aria-current={i.active ? "page" : undefined}
          className={`inline-flex min-h-10 items-center rounded-full px-3.5 text-body-sm font-bold transition-colors ${i.active ? "bg-brand text-ink" : "bg-subtle text-ink-soft hover:text-ink"}`}
        >
          {i.label}
        </Link>
      ))}
    </div>
  );
}
