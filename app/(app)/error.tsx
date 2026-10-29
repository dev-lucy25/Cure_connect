"use client";

import NurseTurtle from "@/components/mascot/nurse-turtle";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";

export default function AppError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <Card className="flex flex-col items-center text-center">
      <NurseTurtle stage={2} mood="error" size={112} decorative />
      <h1 className="mt-2 font-display text-title">앗, 화면을 불러오지 못했어요</h1>
      <p className="mt-1 text-body-sm text-ink-soft">인터넷 연결을 확인하고 다시 시도해 주세요</p>
      <Button type="button" onClick={() => retry()} className="mt-5">
        다시 시도
      </Button>
    </Card>
  );
}
