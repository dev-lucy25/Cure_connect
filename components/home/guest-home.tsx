import Link from "next/link";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import { buttonClass } from "@/components/ui/button";
import { IconCalendar, IconClock, IconNote } from "@/components/ui/icons";
import ProgressHero from "@/components/tracker/progress-hero";

const FEATURES = [
  { Icon: IconClock, title: "1,000시간 트래커", body: "일지만 쓰면 누적 시간과 남은 시간을 세어 줘요" },
  { Icon: IconCalendar, title: "다음 실습 D-day", body: "병원·병동과 시작일을 넣으면 D-day로 알려 줘요" },
  { Icon: IconNote, title: "케이스스터디 · 족보", body: "곧 열려요" },
];

// 로그인 전 홈: 둘러보고, 기록하려면 로그인
export default function GuestHome() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col items-center pt-4 text-center">
        <NurseTurtle stage={2} size={120} />
        <p className="mt-3 font-display text-title text-mint-deep">너스패스</p>
        <h1 className="mt-1 text-headline font-bold">1,000시간 실습, 하루씩 같이 채워요</h1>
        <p className="mt-2 text-body text-ink-soft">느려도 괜찮아요. 꾸준히 쌓으면 졸업이에요.</p>
        <Link href="/login" className={`${buttonClass("primary", true)} mt-6`}>
          로그인하고 기록 시작하기
        </Link>
      </section>

      <section aria-labelledby="preview-title" className="space-y-2">
        <h2 id="preview-title" className="text-body-sm font-bold text-ink-soft">
          이렇게 보여요 (예시)
        </h2>
        <ProgressHero totalMinutes={312 * 60} goalHours={1000} editable={false} />
      </section>

      <ul className="divide-y divide-line/70 rounded-card border border-line/70 bg-surface shadow-soft">
        {FEATURES.map(({ Icon, title, body }) => (
          <li key={title} className="flex items-center gap-3 px-4 py-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mint-soft text-mint-deep">
              <Icon size={20} />
            </span>
            <div>
              <p className="font-bold">{title}</p>
              <p className="text-body-sm text-ink-soft">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
