"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import * as repo from "@/server/payment-repo";
import { MOCK_PURCHASES_PER_DAY, REFUND_DAYS } from "@/lib/credits";
import type { FormState } from "@/lib/validation/form";

// 크레딧 충전(가상 결제). 학생 본인 결제만, 금액은 서버 상품표에서만 정한다.

const orderIdSchema = z.string().regex(/^np_[0-9a-f]{32}$/);

async function student() {
  const user = await getCurrentUser();
  return user.role === "student" ? user : null;
}

export async function createOrderAction(packageId: string): Promise<{ order?: repo.Order; message?: string }> {
  const user = await student();
  if (!user) return { message: "학생 계정만 충전할 수 있어요" };
  const result = await repo.createOrder(user.id, String(packageId)).catch(() => null);
  if (!result) return { message: "주문을 만들지 못했어요. 잠시 후 다시 시도해 주세요" };
  if (!result.ok) {
    return { message: result.reason === "limit" ? `가상 결제는 하루 ${MOCK_PURCHASES_PER_DAY}번까지예요. 내일 다시 이용해 주세요` : "상품을 다시 골라 주세요" };
  }
  return { order: result.order };
}

export async function confirmOrderAction(orderId: string): Promise<{ credits?: number; message?: string }> {
  const user = await student();
  const parsed = orderIdSchema.safeParse(orderId);
  if (!user || !parsed.success) return { message: "결제를 찾을 수 없어요" };
  const result = await repo.confirmOrder(user.id, parsed.data).catch(() => null);
  if (!result || result.status === "failed") return { message: "결제가 승인되지 않았어요. 다시 시도해 주세요" };
  if (result.status === "not_found") return { message: "결제를 찾을 수 없어요" };
  refresh();
  return { credits: result.status === "done" || result.status === "already" ? result.credits : 0 };
}

export async function cancelOrderAction(orderId: string) {
  const user = await student();
  const parsed = orderIdSchema.safeParse(orderId);
  if (user && parsed.success) await repo.cancelOrder(user.id, parsed.data).catch(() => {});
}

const REFUND_MESSAGE: Record<Exclude<repo.RefundResult, "refunded">, string> = {
  not_found: "취소할 수 있는 결제가 아니에요",
  expired: `결제 후 ${REFUND_DAYS}일이 지나 취소할 수 없어요`,
  used: "충전 뒤에 족보를 열람해서 취소할 수 없어요",
  insufficient: "남은 크레딧이 충전분보다 적어 취소할 수 없어요",
};

export async function refundPaymentAction(_prev: FormState<never>, formData: FormData): Promise<FormState<never>> {
  const user = await student();
  const id = z.string().cuid().safeParse(formData.get("id"));
  if (!user || !id.success) return { message: REFUND_MESSAGE.not_found };
  const result = await repo.refundPayment(user.id, id.data).catch(() => null);
  if (result === null) return { message: "취소하지 못했어요. 잠시 후 다시 시도해 주세요" };
  if (result !== "refunded") return { message: REFUND_MESSAGE[result] };
  refresh();
  return { savedAt: Date.now() };
}
