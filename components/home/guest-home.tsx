import Link from "next/link";
import Card from "@/components/ui/card";
import Chip from "@/components/ui/chip";
import { buttonClass } from "@/components/ui/button-class";
import { IconCalendar, IconClock, IconNote } from "@/components/ui/icons";
import PageHeader from "@/components/ui/page-header";
import ProgressHero from "@/components/tracker/progress-hero";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

const FEATURES = [
  { Icon: IconClock, title: "실습 시간 기록", body: "누적 시간과 목표까지 남은 시간을 자동으로 계산해요" },
  { Icon: IconCalendar, title: "실습 D-day", body: "다음 실습까지 남은 날을 알려줘요" },
  { Icon: IconNote, title: "AI 케이스 정리", body: "현장 메모를 SOAPIE 초안으로 정리해요" },
];

// 로그인 전 홈: 큰 제목 → 설명 → 히어로(예시) → 기능 목록 카드. 기록하려면 로그인
export default function GuestHome() {
  return (
    <Stagger className="space-y-3">
      <PageHeader title="NursePass" description="간호학과 임상실습 1,000시간 기록" />
      <StaggerItem className="space-y-3 pt-2">
        <ProgressHero
          totalMinutes={312 * 60}
          goalHours={1000}
          editable={false}
          dday={
            <Chip>
              <IconCalendar size={16} /> 예시 · 내과병동 실습 <span className="font-display text-title leading-none">D-5</span>
            </Chip>
          }
        />
        <Link href="/login" className={buttonClass("primary", true)}>
          로그인하고 시작하기
        </Link>
      </StaggerItem>
      <StaggerItem>
        <Card className="mt-3 space-y-4">
          {FEATURES.map(({ Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-deep">
                <Icon size={20} />
              </span>
              <div>
                <p className="text-title font-bold">{title}</p>
                <p className="text-body-sm text-ink-soft">{body}</p>
              </div>
            </div>
          ))}
        </Card>
      </StaggerItem>
    </Stagger>
  );
}
