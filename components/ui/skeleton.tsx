import NurseTurtle from "@/components/mascot/nurse-turtle";

// 로딩: 걷는 거북이 + 스켈레톤 카드
export function WalkingTurtle({ label = "불러오는 중" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col items-center py-2">
      <div className="animate-turtle-walk">
        <div className="animate-turtle-step">
          <NurseTurtle stage={2} mood="loading" size={64} decorative still />
        </div>
      </div>
      <p className="mt-1 text-body-sm text-ink-soft">{label}...</p>
    </div>
  );
}

export function SkeletonCard({ lines = 2, tall = false }: { lines?: number; tall?: boolean }) {
  return (
    <div aria-hidden className={`rounded-card border border-line bg-surface p-5 ${tall ? "min-h-40" : ""}`}>
      <div className="animate-shimmer h-5 w-2/5 rounded-full bg-subtle" />
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="animate-shimmer mt-3 h-4 rounded-full bg-subtle" style={{ width: `${90 - i * 15}%` }} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div aria-busy className="space-y-3">
      <div className="animate-shimmer h-8 w-1/3 rounded-full bg-subtle" />
      <div className="animate-shimmer h-4 w-2/3 rounded-full bg-subtle" />
      <div className="pt-2">
        <WalkingTurtle />
      </div>
      <SkeletonCard lines={3} tall />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
