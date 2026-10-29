import type { Metadata } from "next";
import Link from "next/link";
import AuthForm from "@/app/login/auth-form";
import ThemeToggle from "@/components/theme/theme-toggle";

export const metadata: Metadata = { title: "로그인 · NursePass" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-(--width-app) flex-1 flex-col px-5 pt-3 pb-10">
      <div className="flex h-(--size-appbar) items-center justify-between">
        <Link href="/" className="inline-flex min-h-11 items-center text-body-sm font-bold text-ink-soft hover:text-ink">
          ← 로그인 없이 둘러보기
        </Link>
        <ThemeToggle />
      </div>
      <div className="flex flex-1 flex-col justify-center py-6">
        <AuthForm />
        <p className="mt-6 text-center text-body-sm text-ink-soft">환자 식별 정보는 입력하지 마세요</p>
      </div>
    </main>
  );
}
