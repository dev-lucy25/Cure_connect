import type { SubmissionStatus } from "@/generated/prisma/client";
import Chip from "@/components/ui/chip";

// 제출 상태 칩: 채점 대기 / 학점 받음 / 보완 요청
export default function SubmissionStatusChip({ status, grade }: { status: SubmissionStatus; grade: string | null }) {
  if (status === "graded") return <Chip>🎓 {grade ?? "채점 완료"}</Chip>;
  if (status === "revision") return <Chip tone="pink">✏️ 보완 요청</Chip>;
  return <Chip tone="warn">📤 채점 대기</Chip>;
}
