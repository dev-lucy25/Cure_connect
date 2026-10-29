import type { Metadata } from "next";
import AuthForm from "@/app/login/auth-form";

export const metadata: Metadata = { title: "로그인 · 너스패스" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-100">
        <AuthForm />
        <p className="mt-6 text-center text-caption text-ink-soft">
          실습 기록에는 환자를 알아볼 수 있는 정보를 적지 말아 주세요
        </p>
      </div>
    </main>
  );
}
