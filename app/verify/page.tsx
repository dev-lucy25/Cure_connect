import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getPendingEmail, maskEmail } from "@/lib/pending-email";
import Card from "@/components/ui/card";
import { Bone } from "@/components/ui/skeleton";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import VerifyForm from "@/app/verify/verify-form";

export const metadata: Metadata = { title: "이메일 인증 · NursePass" };

// 가입 직후(또는 인증 전 로그인 시) 오는 화면. 메일로 받은 숫자 코드를 넣으면 바로 로그인된다
export default function VerifyPage({ searchParams }: PageProps<"/verify">) {
  return (
    <main className="mx-auto flex w-full max-w-(--width-app) flex-1 flex-col px-5 pt-3 pb-10">
      <div className="flex h-(--size-appbar) items-center">
        <Link href="/login" className="inline-flex min-h-11 items-center text-body-sm font-bold text-ink-soft hover:text-ink">
          ← 로그인으로
        </Link>
      </div>
      <div className="flex flex-1 flex-col justify-center py-6">
        <Card>
          <div className="flex flex-col items-center text-center">
            <NurseTurtle stage={2} mood="saved" size={96} decorative />
            <h1 className="mt-1 font-display text-headline text-ink">이메일 인증</h1>
          </div>
          {/* 쿠키·주소를 읽는 부분만 기다린다 */}
          <Suspense fallback={<VerifyBones />}>
            <VerifyContent searchParams={searchParams} />
          </Suspense>
        </Card>
      </div>
    </main>
  );
}

async function VerifyContent({ searchParams }: Pick<PageProps<"/verify">, "searchParams">) {
  const [{ expired }, email] = await Promise.all([searchParams, getPendingEmail("signup")]);
  return (
    <>
      {expired && (
        <p role="alert" className="mt-4 rounded-control bg-warn-bg px-4 py-3 text-body-sm font-medium text-warn-ink">
          메일 링크가 만료됐거나 다른 기기에서 열렸어요. 메일의 숫자 코드로 인증해 주세요.
        </p>
      )}
      {email ? (
        <>
          <p className="mt-2 mb-5 text-center text-body-sm text-ink-soft">
            <span className="font-bold text-ink">{maskEmail(email)}</span>로 보낸 메일의
            <br />
            인증 코드를 입력해 주세요. (메일의 링크를 눌러도 돼요)
          </p>
          <VerifyForm />
        </>
      ) : (
        <div className="mt-3 space-y-4 text-center">
          <p className="text-body-sm text-ink-soft">
            인증할 이메일 정보가 없어요. 가입하거나, 가입한 이메일로 로그인하면 인증 코드를 넣을 수 있어요.
          </p>
          <Link href="/login" className="inline-flex min-h-11 items-center font-bold text-brand-deep underline underline-offset-2">
            로그인 · 회원가입으로 가기
          </Link>
        </div>
      )}
    </>
  );
}

function VerifyBones() {
  return (
    <div role="status" aria-busy aria-label="불러오는 중" className="mt-3 space-y-4">
      <Bone className="mx-auto h-4 w-3/4" />
      <Bone className="h-12 w-full rounded-control" />
      <Bone className="h-12 w-full rounded-control" />
    </div>
  );
}
