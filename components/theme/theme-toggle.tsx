"use client";

// 밝게/어둡게 토글. 현재 테마는 <html data-theme>에 있고(첫 그림 전에 인라인 스크립트가 설정),
// 아이콘은 CSS로 바꿔 보여주므로 상태가 필요 없다.
// 바꿀 때: 토글 버튼 자리에서 새 테마가 원형으로 퍼져 나간다(View Transitions).
// 지원하지 않는 브라우저는 색이 0.3초 동안 부드럽게 바뀌고, 움직임 줄이기 설정이면 바로 바뀐다.

const REVEAL_MS = 500;
const FADE_MS = 300;

export default function ThemeToggle() {
  function apply(next: "light" | "dark") {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply(next);
      return;
    }

    if (!document.startViewTransition) {
      // 대체: 잠깐 모든 요소의 색 바뀜에 transition을 걸었다가 푼다
      root.classList.add("theme-switching");
      apply(next);
      window.setTimeout(() => root.classList.remove("theme-switching"), FADE_MS + 50);
      return;
    }

    // 버튼 가운데에서 화면의 가장 먼 모서리까지 원이 커진다
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transition = document.startViewTransition(() => apply(next));
    transition.ready
      .then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: REVEAL_MS, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(() => {});
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="밝게/어둡게 바꾸기"
      title="밝게/어둡게 바꾸기"
      className="press relative grid size-11 place-items-center overflow-hidden rounded-full text-ink-soft hover:bg-subtle hover:text-ink"
    >
      {/* 밝을 때는 달, 어두울 때는 해 — 회전하며 서로 바뀐다 */}
      <svg
        viewBox="0 0 24 24"
        width={20}
        height={20}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        aria-hidden
        className="theme-icon col-start-1 row-start-1 rotate-0 opacity-100 dark:scale-50 dark:-rotate-90 dark:opacity-0"
      >
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        width={20}
        height={20}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        aria-hidden
        className="theme-icon col-start-1 row-start-1 scale-50 rotate-90 opacity-0 dark:scale-100 dark:rotate-0 dark:opacity-100"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
      </svg>
    </button>
  );
}
