"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setStatsOptOutAction } from "@/server/stats-actions";
import Card from "@/components/ui/card";
import Switch from "@/components/ui/switch";
import FormStatus from "@/components/ui/form-status";

// 내 정보: 교수 익명 통계에 내 기록 포함 (기본 켜짐). 이름·개별 기록은 절대 보이지 않는다
export default function StatsConsent({ included }: { included: boolean }) {
  const [shown, setShown] = useOptimistic(included);
  const [result, setResult] = useState<{ message?: string; savedAt?: number }>({});
  const [, start] = useTransition();
  return (
    <Card data-stats-consent>
      <h2 className="text-title font-bold text-ink">📊 익명 통계</h2>
      <p className="mt-1 text-body-sm text-ink-soft">
        일지의 &ldquo;오늘 어땠나요?&rdquo;(난이도·어려웠던 술기)와 AI 프리셉터 모의질문 점수는 교수님께 학생 5명 이상 묶음으로만 보여요.
        이름과 개별 기록은 보이지 않아요.
      </p>
      <Switch
        className="mt-2"
        label="익명 통계에 내 기록 포함"
        checked={shown}
        onChange={(e) => {
          const next = e.target.checked;
          start(async () => {
            setShown(next);
            setResult(await setStatsOptOutAction(next));
          });
        }}
      />
      <FormStatus message={result.message} savedAt={result.savedAt} savedText="설정을 바꿨어요" />
    </Card>
  );
}
