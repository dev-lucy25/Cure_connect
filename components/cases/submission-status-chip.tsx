import type { SubmissionStatus } from "@/generated/prisma/client";
import Chip from "@/components/ui/chip";
import { IconGradCap, IconPencil, IconUpload } from "@/components/ui/icons";

// 제출 상태 칩: 채점 대기 / 학점 받음 / 보완 요청
export default function SubmissionStatusChip({
  status,
  grade,
}: {
  status: SubmissionStatus;
  grade: string | null;
}) {
  if (status === "graded")
    return (
      <Chip>
        <IconGradCap size={16} />
        {grade ?? "채점 완료"}
      </Chip>
    );
  if (status === "revision")
    return (
      <Chip tone="pink">
        <IconPencil size={15} />
        보완 요청
      </Chip>
    );
  return (
    <Chip tone="warn">
      <IconUpload size={15} />
      채점 대기
    </Chip>
  );
}
