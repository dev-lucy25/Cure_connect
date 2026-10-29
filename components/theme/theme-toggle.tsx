"use client";

// 밝게/어둡게 토글. 현재 테마는 <html data-theme>에 있고(첫 그림 전에 인라인 스크립트가 설정),
// 아이콘은 CSS로 바꿔 보여주므로 상태나 effect가 필요 없다.
export default function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="밝게/어둡게 바꾸기"
      title="밝게/어둡게 바꾸기"
      className="press grid size-11 place-items-center rounded-full text-ink-soft hover:bg-subtle hover:text-ink"
    >
      {/* 밝을 때는 달, 어두울 때는 해 */}
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden className="dark:hidden">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden className="hidden dark:block">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
      </svg>
    </button>
  );
}
