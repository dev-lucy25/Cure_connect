// 폼 상태: 오류는 그 자리에 문구로, 저장 성공은 화면 아래 토스트("저장했어요 🐢")로 보여준다.
export default function FormStatus({ message, savedAt, savedText = "저장했어요 🐢" }: { message?: string; savedAt?: number; savedText?: string }) {
  if (message) {
    return (
      <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-body-sm font-medium text-danger">
        {message}
      </p>
    );
  }
  if (savedAt) {
    // key가 바뀌면 애니메이션이 처음부터 다시 돈다 (저장할 때마다 다시 보임). 탭 바 바로 위, 앱 폭 가운데
    return (
      <p
        key={savedAt}
        role="status"
        className="animate-toast pointer-events-none fixed bottom-[calc(var(--size-tab)+env(safe-area-inset-bottom)+12px)] left-1/2 z-30 rounded-full bg-ink px-5 py-2.5 text-body-sm font-bold whitespace-nowrap text-canvas shadow-soft"
      >
        {savedText}
      </p>
    );
  }
  return null;
}
