import NurseTurtle from "@/components/mascot/nurse-turtle";

// 로딩 화면. 데이터를 기다리는 모든 자리에 "그 화면 모양을 닮은" 스켈레톤을 둔다.
// 반짝임은 빛이 왼쪽→오른쪽으로 지나가는 방식(.skeleton, globals.css). 움직임 줄이기 설정이면 멈춘 회색 블록.
// 바깥 상자에 aria-busy와 이름(aria-label)을 주고, 안쪽 블록은 화면 읽기에서 숨긴다.

/** 회색 블록 하나 (크기·모양은 className으로) */
export function Bone({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton rounded-full ${className}`} />;
}

function SkeletonBox({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy aria-label={label} data-skeleton className={className}>
      {children}
    </div>
  );
}

function CardShell({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-card border border-line bg-surface p-5 ${className}`}>{children}</div>;
}

/** 걷는 거북이 (AI 정리·답변처럼 몇 초 걸리는 작업 대기) */
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
    <CardShell className={tall ? "min-h-40" : ""}>
      <Bone className="h-5 w-2/5" />
      {Array.from({ length: lines }, (_, i) => (
        <Bone key={i} className="mt-3 h-4" />
      ))}
    </CardShell>
  );
}

function HeaderBones() {
  return (
    <div className="space-y-2">
      <Bone className="h-8 w-32" />
      <Bone className="h-4 w-56 max-w-full" />
    </div>
  );
}

/** 일반 화면 (모양을 모를 때) */
export function PageSkeleton() {
  return (
    <SkeletonBox label="화면을 불러오는 중" className="space-y-3">
      <HeaderBones />
      <div className="space-y-3 pt-2">
        <SkeletonCard lines={3} tall />
        <SkeletonCard />
      </div>
    </SkeletonBox>
  );
}

/** 학생 홈: 배너 → (히어로·과목 7칸 | 다음 실습·준비물·일정 5칸) → 일지. 실제 화면과 같은 반응형 배치 */
export function HomeSkeleton() {
  return (
    <SkeletonBox label="실습 기록을 불러오는 중" className="space-y-3">
      <HeaderBones />
      <div className="pt-2">
        <CardShell>
          <Bone className="h-5 w-3/5" />
          <Bone className="mt-2 h-4 w-2/5" />
        </CardShell>
      </div>
      <div className="flex flex-col gap-4 md:grid md:grid-cols-12 md:items-start">
        <CardShell className="md:col-span-7">
          <div className="flex items-center gap-4">
            <div aria-hidden className="skeleton size-20 shrink-0 rounded-card" />
            <div className="flex-1 space-y-2">
              <Bone className="h-4 w-1/3" />
              <Bone className="h-10 w-1/2" />
              <Bone className="h-4 w-3/4" />
            </div>
          </div>
          <Bone className="mt-5 h-4" />
          <Bone className="mt-4 h-8 w-1/2" />
        </CardShell>
        <div className="space-y-4 md:col-span-5 md:row-span-2">
          <CardShell>
            <Bone className="h-6 w-1/3" />
            <Bone className="mt-3 h-5 w-3/4" />
            <Bone className="mt-2 h-4 w-2/3" />
            <div aria-hidden className="skeleton mt-4 h-24 rounded-control" />
          </CardShell>
          <CardShell className="space-y-3">
            <Bone className="h-5 w-1/2" />
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div aria-hidden className="skeleton size-5 shrink-0 rounded-md" />
                <Bone className="h-4 flex-1" />
              </div>
            ))}
          </CardShell>
        </div>
        <CardShell className="md:col-span-7">
          <Bone className="h-5 w-2/5" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} aria-hidden className="skeleton h-14 rounded-control" />
            ))}
          </div>
        </CardShell>
      </div>
      <div className="space-y-3 pt-3">
        <Bone className="h-6 w-24" />
        <LogCardBones />
        <LogCardBones />
      </div>
    </SkeletonBox>
  );
}

function LogCardBones() {
  return (
    <CardShell>
      <div className="flex justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Bone className="h-5 w-2/5" />
          <Bone className="h-4 w-1/3" />
        </div>
        <Bone className="h-7 w-16" />
      </div>
      <Bone className="mt-4 h-4" />
      <Bone className="mt-2 h-4 w-4/5" />
    </CardShell>
  );
}

/** 실습 일지 "더 보기" 중 */
export function LogsMoreSkeleton() {
  return (
    <SkeletonBox label="일지를 더 불러오는 중" className="space-y-3">
      <LogCardBones />
      <LogCardBones />
    </SkeletonBox>
  );
}

function CaseCardBones() {
  return (
    <CardShell>
      <div className="flex justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Bone className="h-5 w-1/2" />
          <Bone className="h-4 w-1/4" />
        </div>
        <Bone className="h-7 w-20" />
      </div>
      <Bone className="mt-3 h-4" />
    </CardShell>
  );
}

/** 케이스 "더 보기" 중 */
export function CasesMoreSkeleton() {
  return (
    <SkeletonBox label="케이스를 더 불러오는 중" className="space-y-3">
      <CaseCardBones />
      <CaseCardBones />
    </SkeletonBox>
  );
}

/** 케이스 목록: 새 케이스 카드 → 내 케이스 카드들 */
export function CasesSkeleton() {
  return (
    <SkeletonBox label="케이스를 불러오는 중" className="space-y-3">
      <HeaderBones />
      <div className="pt-2">
        <CardShell className="flex items-center gap-4">
          <div aria-hidden className="skeleton size-16 shrink-0 rounded-card" />
          <div className="flex-1 space-y-2">
            <Bone className="h-5 w-1/3" />
            <Bone className="h-4 w-1/2" />
          </div>
          <Bone className="h-12 w-28" />
        </CardShell>
      </div>
      <div className="space-y-3 pt-3">
        <Bone className="h-6 w-24" />
        {Array.from({ length: 4 }, (_, i) => (
          <CaseCardBones key={i} />
        ))}
      </div>
    </SkeletonBox>
  );
}

/** 케이스 상세: 메모 카드 → SOAPIE 카드 → 질문 카드 */
export function CaseDetailSkeleton() {
  return (
    <SkeletonBox label="케이스를 불러오는 중" className="space-y-3">
      <CardShell>
        <Bone className="h-6 w-1/2" />
        <Bone className="mt-2 h-4 w-1/4" />
        <div aria-hidden className="skeleton mt-4 h-24 rounded-control" />
      </CardShell>
      <CardShell>
        <div className="flex justify-between">
          <Bone className="h-6 w-1/3" />
          <Bone className="h-7 w-24" />
        </div>
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Bone className="h-7 w-28" />
              <Bone className="h-4 w-4/5" />
            </div>
          ))}
        </div>
        <Bone className="mt-4 h-12" />
      </CardShell>
      <CardShell>
        <Bone className="h-6 w-1/3" />
        <div aria-hidden className="skeleton mt-4 h-16 rounded-control" />
        <Bone className="mt-3 h-12" />
      </CardShell>
    </SkeletonBox>
  );
}

/** 내 정보: (프로필 폼 | 계정·교수 인증) 두 칸 */
export function MeSkeleton() {
  const field = (key: number) => (
    <div key={key} className="space-y-2">
      <Bone className="h-4 w-20" />
      <div aria-hidden className="skeleton h-12 rounded-control" />
    </div>
  );
  return (
    <SkeletonBox label="내 정보를 불러오는 중" className="space-y-3">
      <HeaderBones />
      <div className="grid gap-4 pt-2 md:grid-cols-2 md:items-start">
        <CardShell className="space-y-4">
          <Bone className="h-6 w-20" />
          {[0, 1, 2, 3].map(field)}
          <Bone className="h-12" />
        </CardShell>
        <div className="space-y-4">
          <CardShell className="space-y-3">
            <Bone className="h-6 w-16" />
            <Bone className="h-12" />
            <Bone className="h-12" />
          </CardShell>
          <CardShell className="space-y-4">
            <Bone className="h-6 w-28" />
            {[0, 1].map(field)}
          </CardShell>
        </div>
      </div>
    </SkeletonBox>
  );
}
