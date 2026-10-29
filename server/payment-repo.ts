import "server-only";
import { db } from "@/lib/db";
import { todayKst } from "@/lib/dates";
import { MOCK_PURCHASES_PER_DAY, REFUND_DAYS, findPackage } from "@/lib/credits";
import { mockProvider, type PaymentProviderApi } from "@/server/payment-provider";
import type { PaymentStatus } from "@/generated/prisma/client";

// 크레딧 충전 결제 DB 처리. userId는 반드시 서버에서 확인한 로그인 사용자 id여야 한다.
// 금액·크레딧은 서버의 상품표에서만 정하고, 충전·취소는 한 트랜잭션에서 잔액과 내역을 함께 바꾼다.

const TX = { timeout: 15_000, maxWait: 10_000 };
const DAY_MS = 86_400_000;

export type Order = { orderId: string; amountKrw: number; credits: number; label: string };
export type CreateOrderResult = { ok: true; order: Order } | { ok: false; reason: "package" | "limit" };

/** 주문 만들기(결제 대기). 가상 결제는 하루 완료 3번까지 */
export async function createOrder(userId: string, packageId: string): Promise<CreateOrderResult> {
  const pkg = findPackage(packageId);
  if (!pkg) return { ok: false, reason: "package" };
  const doneToday = await db.payment.count({
    where: { userId, provider: "mock", status: "done", approvedAt: { gte: new Date(`${todayKst()}T00:00:00+09:00`) } },
  });
  if (doneToday >= MOCK_PURCHASES_PER_DAY) return { ok: false, reason: "limit" };
  const orderId = `np_${crypto.randomUUID().replace(/-/g, "")}`;
  await db.payment.create({ data: { orderId, userId, packageId: pkg.id, amountKrw: pkg.priceKrw, credits: pkg.credits } });
  return { ok: true, order: { orderId, amountKrw: pkg.priceKrw, credits: pkg.credits, label: pkg.label } };
}

export type ConfirmResult = { status: "done" | "already"; credits: number } | { status: "not_found" | "failed" };

/**
 * 결제 승인 → 크레딧 충전. 같은 주문을 여러 번 승인해도(연타·새로고침) 대기 → 완료 조건부 갱신과
 * 내역 고유 인덱스(결제당 충전 1번) 덕분에 한 번만 충전된다.
 */
export async function confirmOrder(userId: string, orderId: string, provider: PaymentProviderApi = mockProvider): Promise<ConfirmResult> {
  const payment = await db.payment.findFirst({ where: { orderId, userId }, select: { id: true, status: true, amountKrw: true, credits: true } });
  if (!payment) return { status: "not_found" };
  if (payment.status === "done") return { status: "already", credits: payment.credits };
  if (payment.status !== "ready") return { status: "not_found" };

  const approved = await provider.approve({ orderId, amountKrw: payment.amountKrw });
  if (!approved.ok) {
    await db.payment.updateMany({ where: { id: payment.id, status: "ready" }, data: { status: "failed" } });
    return { status: "failed" };
  }

  return db.$transaction(async (tx) => {
    const { count } = await tx.payment.updateMany({ where: { id: payment.id, status: "ready" }, data: { status: "done", approvedAt: new Date() } });
    if (count === 0) return { status: "already" as const, credits: payment.credits };
    await tx.profile.update({ where: { id: userId }, data: { credits: { increment: payment.credits } } });
    await tx.creditLedger.create({ data: { userId, delta: payment.credits, reason: "purchase", paymentId: payment.id } });
    return { status: "done" as const, credits: payment.credits };
  }, TX);
}

/** 결제창에서 닫음(승인 전) → 실패로 남긴다 */
export async function cancelOrder(userId: string, orderId: string) {
  await db.payment.updateMany({ where: { orderId, userId, status: "ready" }, data: { status: "failed" } });
}

export type RefundResult = "refunded" | "not_found" | "expired" | "used" | "insufficient";

/**
 * 결제 취소(환불): 결제 후 7일 안, 그 뒤로 족보를 연 적이 없고 잔액이 충전분 이상일 때만.
 * 잔액 행을 잠그고 완료 → 취소 조건부 갱신으로 두 번 취소되지 않는다.
 */
export async function refundPayment(userId: string, paymentId: string): Promise<RefundResult> {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({ where: { id: paymentId, userId, status: "done" }, select: { credits: true, approvedAt: true } });
    if (!payment?.approvedAt) return "not_found";
    if (Date.now() - payment.approvedAt.getTime() > REFUND_DAYS * DAY_MS) return "expired";
    const [profile] = await tx.$queryRaw<{ credits: number }[]>`SELECT "credits" FROM "Profile" WHERE "id" = ${userId}::uuid FOR UPDATE`;
    const spent = await tx.creditLedger.count({ where: { userId, reason: "unlock", createdAt: { gt: payment.approvedAt } } });
    if (spent > 0) return "used";
    if (profile.credits < payment.credits) return "insufficient";
    const { count } = await tx.payment.updateMany({ where: { id: paymentId, status: "done" }, data: { status: "canceled", canceledAt: new Date() } });
    if (count === 0) return "not_found";
    await tx.profile.update({ where: { id: userId }, data: { credits: { decrement: payment.credits } } });
    await tx.creditLedger.create({ data: { userId, delta: -payment.credits, reason: "refund", paymentId } });
    return "refunded";
  }, TX);
}

export type PaymentRow = {
  id: string;
  label: string;
  amountKrw: number;
  credits: number;
  status: PaymentStatus;
  approvedAt: string | null;
  /** 지금 취소할 수 있는가 (7일 안 + 그 뒤로 열람 없음 + 잔액 충분) */
  refundable: boolean;
};

/** 내 결제 내역(완료·취소만, 최근 20개) */
export async function listPayments(userId: string): Promise<PaymentRow[]> {
  const [rows, profile, lastUnlock] = await Promise.all([
    db.payment.findMany({
      where: { userId, status: { in: ["done", "canceled"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, packageId: true, amountKrw: true, credits: true, status: true, approvedAt: true },
    }),
    db.profile.findUniqueOrThrow({ where: { id: userId }, select: { credits: true } }),
    db.creditLedger.findFirst({ where: { userId, reason: "unlock" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);
  const now = Date.now();
  return rows.map((r) => ({
    id: r.id,
    label: findPackage(r.packageId)?.label ?? r.packageId,
    amountKrw: r.amountKrw,
    credits: r.credits,
    status: r.status,
    approvedAt: r.approvedAt?.toISOString() ?? null,
    refundable:
      r.status === "done" &&
      r.approvedAt !== null &&
      now - r.approvedAt.getTime() <= REFUND_DAYS * DAY_MS &&
      (!lastUnlock || lastUnlock.createdAt <= r.approvedAt) &&
      profile.credits >= r.credits,
  }));
}
