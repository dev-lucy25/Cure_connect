import type { Metadata } from "next";
import Link from "next/link";
import AuthForm from "@/app/login/auth-form";
import ThemeToggle from "@/components/theme/theme-toggle";
import { listOrganizations } from "@/server/org-repo";

export const metadata: Metadata = { title: "로그인 · NursePass" };

const FEATURES = [
  "법정 의무 임상실습 1,000시간 자동 계산 & D-Day 알림",
  "병동 거친 메모 → SOAPIE 간호기록 & NANDA 진단 변환",
  "선배 병동 꿀팁 족보 크레딧 마켓",
];

// 모바일: 소개 → 로그인 폼 세로로. md 이상: 왼쪽 소개 / 오른쪽 폼 2단
export default async function LoginPage() {
  const orgs = await listOrganizations();

  return (
    <main className="mx-auto flex w-full max-w-(--width-app) flex-1 flex-col px-5 pt-3 pb-10 md:max-w-(--width-wide) md:px-8">
      <div className="flex h-(--size-appbar) items-center justify-between">
        <Link href="/" className="inline-flex min-h-11 items-center text-body-sm font-bold text-ink-soft hover:text-ink">
          ← 로그인 없이 둘러보기
        </Link>
        <ThemeToggle />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-6 py-6 md:grid md:grid-cols-2 md:items-center md:gap-12">
        <section aria-label="NursePass 소개" className="rounded-card bg-brand-soft p-5 md:p-8">
          <p className="text-body-sm font-bold text-brand-deep">간호교육인증평가 1,000시간 완벽 대응</p>
          <h2 className="mt-2 font-display text-headline text-ink md:text-[32px] md:leading-tight">
            실습 출근부터 A+ 케이스스터디까지, 너스패스 하나로 끝.
          </h2>
          <p className="mt-3 hidden text-body text-ink-soft md:block">
            학생은 1,000시간 실습 이수율과 AI 간호과정 초안을 관리하고, 교수는 학과 전체 실습 현황을 실시간으로 확인합니다.
          </p>
          <ul className="mt-4 space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-body-sm text-ink">
                <span aria-hidden className="font-bold text-brand-deep">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
        </section>
        <div>
          <AuthForm orgs={orgs} />
          <p className="mt-6 text-center text-body-sm text-ink-soft">환자 식별 정보는 입력하지 마세요</p>
        </div>
      </div>
    </main>
  );
}
