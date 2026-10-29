import { NOTI_CRITERIA, VITAL_COLUMNS, VITAL_ROWS } from "@/lib/vitals";
import Card from "@/components/ui/card";

// 연령별 활력징후 정상 범위 + 성인 즉시 보고(Noti) 기준. sm 이상은 표, 모바일은 연령별 카드
export default function VitalSigns() {
  return (
    <Card>
      <span className="inline-block rounded-md bg-p-bg px-2.5 py-1 text-caption font-bold text-p-ink">바이탈 액팅 벼락치기</span>
      <h2 className="mt-2 text-title font-bold text-ink">🩺 연령별 활력징후 정상 범위</h2>
      <p className="mt-1 text-body-sm text-ink-soft">라운딩 중 이상 수치를 보면 바로 담당 간호사 선생님께 보고(Noti)할 기준이에요.</p>

      {/* sm 이상: 표 */}
      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-left text-body-sm">
          <thead>
            <tr className="bg-subtle text-ink-soft">
              <th scope="col" className="rounded-l-control p-2.5">
                구분
              </th>
              {VITAL_COLUMNS.map((c, i) => (
                <th key={c.key} scope="col" className={`p-2.5 ${i === VITAL_COLUMNS.length - 1 ? "rounded-r-control" : ""}`}>
                  {c.label} <span className="font-normal">({c.unit})</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {VITAL_ROWS.map((r) => (
              <tr key={r.group}>
                <th scope="row" className="p-2.5 font-bold text-ink">
                  {r.group} <span className="font-normal text-ink-soft">({r.en})</span>
                </th>
                {VITAL_COLUMNS.map((c) => (
                  <td key={c.key} className="p-2.5 text-ink">
                    {r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일: 연령별 카드 */}
      <ul className="mt-4 space-y-2 sm:hidden">
        {VITAL_ROWS.map((r) => (
          <li key={r.group} className="rounded-control bg-subtle p-3">
            <p className="font-bold text-ink">
              {r.group} <span className="text-caption font-normal text-ink-soft">({r.en})</span>
            </p>
            <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-body-sm">
              {VITAL_COLUMNS.map((c) => (
                <div key={c.key}>
                  <dt className="text-caption text-ink-soft">
                    {c.label} ({c.unit})
                  </dt>
                  <dd className="font-bold text-ink">{r[c.key]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      <div role="note" className="mt-4 rounded-control border border-danger/30 bg-danger-soft px-3 py-2.5 text-body-sm text-danger">
        <b>🚨 즉시 보고(Noti) 기준 (성인)</b>: {NOTI_CRITERIA.join(", ")}
      </div>
      <p className="mt-2 text-caption text-ink-soft">참고용 기준이에요. 실습 병원·교수님이 정한 기준이 우선이에요.</p>
    </Card>
  );
}
