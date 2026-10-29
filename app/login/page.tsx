import type { Metadata } from "next";
import Link from "next/link";
import AuthForm from "@/app/login/auth-form";

export const metadata: Metadata = { title: "로그인 · 너스패스" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-100">
        <Link href="/" className="mb-3 inline-flex min-h-11 items-center text-body-sm font-bold text-ink-soft hover:text-ink">
          ← 로그인 없이 둘러보기
        </Link>
        <AuthForm />
        <p className="mt-6 text-center text-caption text-ink-soft">
          실습 기록에는 환자를 알아볼 수 있는 정보를 적지 말아 주세요
        </p>
      </div>
    </main>
  );
}
