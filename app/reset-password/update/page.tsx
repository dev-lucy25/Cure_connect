import type { Metadata } from "next";
import { Suspense } from "react";
import Card from "@/components/ui/card";
import { NewPasswordForm } from "@/app/reset-password/reset-forms";

export const metadata: Metadata = { title: "새 비밀번호 · NursePass" };

// 메일 링크(/auth/callback)나 인증 코드를 거쳐 로그인된 상태로 들어온다. 로그인 확인은 저장할 때 서버에서 한다
export default function UpdatePasswordPage({ searchParams }: PageProps<"/reset-password/update">) {
  return (
    <main className="mx-auto flex w-full max-w-(--width-app) flex-1 flex-col justify-center px-5 py-10">
      <Card>
        <h1 className="font-display text-headline text-ink">새 비밀번호 정하기</h1>
        <p className="mt-1 mb-5 text-body-sm text-ink-soft">앞으로 로그인할 때 쓸 비밀번호를 입력해 주세요.</p>
        <Suspense>
          <RetryNotice searchParams={searchParams} />
        </Suspense>
        <NewPasswordForm />
      </Card>
    </main>
  );
}

// 코드는 맞았는데 비밀번호 저장만 실패해서 넘어온 경우
async function RetryNotice({ searchParams }: Pick<PageProps<"/reset-password/update">, "searchParams">) {
  const { retry } = await searchParams;
  if (!retry) return null;
  return (
    <p role="alert" className="mb-4 rounded-control bg-warn-bg px-4 py-3 text-body-sm font-medium text-warn-ink">
      {retry === "same" ? "인증은 됐어요. 이전과 다른 비밀번호로 다시 정해 주세요." : "인증은 됐어요. 비밀번호를 한 번 더 저장해 주세요."}
    </p>
  );
}
