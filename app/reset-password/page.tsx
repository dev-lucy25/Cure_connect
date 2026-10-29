import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Card from "@/components/ui/card";
import { RequestResetForm } from "@/app/reset-password/reset-forms";

export const metadata: Metadata = { title: "비밀번호 재설정 · NursePass" };

export default function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  return (
    <main className="mx-auto flex w-full max-w-(--width-app) flex-1 flex-col px-5 pt-3 pb-10">
      <div className="flex h-(--size-appbar) items-center">
        <Link href="/login" className="inline-flex min-h-11 items-center text-body-sm font-bold text-ink-soft hover:text-ink">
          ← 로그인으로
        </Link>
      </div>
      <div className="flex flex-1 flex-col justify-center py-6">
        <Card>
          <h1 className="font-display text-headline text-ink">비밀번호 재설정</h1>
          <p className="mt-1 mb-5 text-body-sm text-ink-soft">가입한 이메일로 비밀번호를 새로 정하는 링크를 보내 드려요.</p>
          <Suspense>
            <ExpiredNotice searchParams={searchParams} />
          </Suspense>
          <RequestResetForm />
        </Card>
      </div>
    </main>
  );
}

async function ExpiredNotice({ searchParams }: Pick<PageProps<"/reset-password">, "searchParams">) {
  const { expired } = await searchParams;
  if (!expired) return null;
  return (
    <p role="alert" className="mb-4 rounded-control bg-warn-bg px-4 py-3 text-body-sm font-medium text-warn-ink">
      링크가 만료됐거나 이미 사용됐어요. 다시 받아 주세요.
    </p>
  );
}
