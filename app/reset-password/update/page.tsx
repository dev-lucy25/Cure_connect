import type { Metadata } from "next";
import Card from "@/components/ui/card";
import { NewPasswordForm } from "@/app/reset-password/reset-forms";

export const metadata: Metadata = { title: "새 비밀번호 · NursePass" };

// 메일 링크(/auth/callback)를 거쳐 로그인된 상태로 들어온다. 로그인 확인은 저장할 때 서버에서 한다
export default function UpdatePasswordPage() {
  return (
    <main className="mx-auto flex w-full max-w-(--width-app) flex-1 flex-col justify-center px-5 py-10">
      <Card>
        <h1 className="font-display text-headline text-ink">새 비밀번호 정하기</h1>
        <p className="mt-1 mb-5 text-body-sm text-ink-soft">앞으로 로그인할 때 쓸 비밀번호를 입력해 주세요.</p>
        <NewPasswordForm />
      </Card>
    </main>
  );
}
