import { notFound } from "next/navigation";
import NurseTurtle, { type TurtleMood, type TurtleStage } from "@/components/mascot/nurse-turtle";

// 개발 모드 전용 마스코트 미리보기. 배포(production)에서는 404.
const STAGES: { stage: TurtleStage; name: string }[] = [
  { stage: 1, name: "아기" },
  { stage: 2, name: "실습생" },
  { stage: 3, name: "청진기" },
  { stage: 4, name: "능숙" },
  { stage: 5, name: "졸업" },
];
const MOODS: { mood: TurtleMood; name: string }[] = [
  { mood: "default", name: "기본" },
  { mood: "empty", name: "빈 목록" },
  { mood: "loading", name: "로딩" },
  { mood: "saved", name: "저장됨" },
  { mood: "error", name: "오류" },
];

export default function MascotPreview() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="font-display text-headline">마스코트 미리보기</h1>
      <div className="mt-6 overflow-x-auto">
        <table className="border-separate border-spacing-2">
          <thead>
            <tr>
              <th />
              {MOODS.map((m) => (
                <th key={m.mood} className="text-body-sm text-ink-soft">
                  {m.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAGES.map((s) => (
              <tr key={s.stage}>
                <th className="pr-2 text-left text-body-sm text-ink-soft">
                  {s.stage}. {s.name}
                </th>
                {MOODS.map((m) => (
                  <td key={m.mood} className="rounded-card bg-surface p-2 shadow-soft">
                    <NurseTurtle stage={s.stage} mood={m.mood} size={120} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
