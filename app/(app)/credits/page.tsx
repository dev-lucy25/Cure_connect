import type { Metadata } from "next";
import { Suspense } from "react";
import { getOptionalUser } from "@/server/auth";
import { getCredits, listLedger } from "@/server/notes-repo";
import { listPayments } from "@/server/payment-repo";
import PaymentHistory from "@/components/credits/payment-history";
import LoginPrompt from "@/components/home/login-prompt";
import RoleNotice from "@/components/home/role-notice";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import AnimatedNumber from "@/components/motion/animated-number";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import { CreditsSkeleton } from "@/components/ui/skeleton";
import CreditsShopCard from "@/components/credits/credits-shop-card";
import LedgerList from "@/components/credits/ledger-list";
import CreditMark from "@/components/ui/credit-mark";

export const metadata: Metadata = { title: "크레딧 · NursePass" };

export default function CreditsPage() {
  return (
    <Suspense fallback={<CreditsSkeleton />}>
      <CreditsContent />
    </Suspense>
  );
}

// 학생: 보유 크레딧 + 충전소 / 크레딧 내역. md 이상 두 칸
async function CreditsContent() {
  const user = await getOptionalUser();
  if (!user)
    return (
      <LoginPrompt
        title="로그인하고 크레딧을 확인해요"
        body="가입하면 300 크레딧을 드려요"
      />
    );
  if (user.role !== "student")
    return (
      <RoleNotice
        title="학생 계정 전용 화면이에요"
        body="크레딧은 족보를 열람하는 학생이 써요"
      />
    );
  const [credits, ledger, payments] = await Promise.all([
    getCredits(user.id),
    listLedger(user.id),
    listPayments(user.id),
  ]);

  return (
    <Stagger className="space-y-3">
      <PageHeader
        title="크레딧"
        description="족보 열람·판매·충전 내역 · 충전은 테스트용 가상 결제"
      />
      <div className="grid gap-4 pt-2 md:grid-cols-2 md:items-start">
        <StaggerItem>
          <Card>
            <p className="text-body-sm font-bold text-ink-soft">보유 크레딧</p>
            <p className="mt-1 font-display text-display leading-none text-ink">
              <CreditMark size={40} className="mr-1.5 inline align-[-0.1em]" />
              <AnimatedNumber
                value={credits}
                format={{ maximumFractionDigits: 0 }}
              />
              <span className="text-title text-ink-soft"> C</span>
            </p>
            <div className="mt-4">
              <CreditsShopCard />
            </div>
          </Card>
          <Card className="mt-4">
            <h2 className="text-title font-bold text-ink">결제 내역</h2>
            <PaymentHistory rows={payments} />
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <h2 className="text-title font-bold text-ink">내역</h2>
            <LedgerList items={ledger.items} nextCursor={ledger.nextCursor} />
          </Card>
        </StaggerItem>
      </div>
    </Stagger>
  );
}
