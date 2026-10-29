// 폼 아래 상태 한 줄: 오류 문구 또는 잠깐 보였다 사라지는 "저장됐어요"
export default function FormStatus({ message, savedAt, savedText = "저장됐어요" }: { message?: string; savedAt?: number; savedText?: string }) {
  if (message) {
    return (
      <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-body-sm font-medium text-danger">
        {message}
      </p>
    );
  }
  if (savedAt) {
    // key가 바뀌면 애니메이션이 처음부터 다시 돈다 (저장할 때마다 다시 보임)
    return (
      <p key={savedAt} role="status" className="animate-fade-late text-body-sm font-bold text-mint-deep">
        ✓ {savedText}
      </p>
    );
  }
  return null;
}
