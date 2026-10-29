import type { Metadata } from "next";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import PageHeader from "@/components/ui/page-header";
import IvCalculator from "@/components/tools/iv-calculator";
import VitalSigns from "@/components/tools/vital-signs";
import LearningLinks from "@/components/tools/learning-links";

export const metadata: Metadata = { title: "실습 도구 · NursePass" };

// 로그인 없이 쓰는 병동 도구: 수액 gtt 계산기 + 활력징후 정상 범위. 모바일 세로, md 이상 두 칸
export default function ToolsPage() {
  return (
    <Stagger className="space-y-3">
      <PageHeader title="실습 도구" description="병동에서 바로 쓰는 계산기와 기준표, AI 학습 도구" />
      <StaggerItem className="pt-2">
        <LearningLinks />
      </StaggerItem>
      <div className="grid gap-4 pt-2 md:grid-cols-2 md:items-start">
        <StaggerItem>
          <IvCalculator />
        </StaggerItem>
        <StaggerItem>
          <VitalSigns />
        </StaggerItem>
      </div>
    </Stagger>
  );
}
