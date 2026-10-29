import "server-only";

// 결제 승인 처리. 지금은 가상 결제라 항상 승인한다(실제 돈 없음).
// 토스페이먼츠로 바꿀 때: 결제창 성공 후 받은 paymentKey로 토스 승인 API(비밀 키는 lib/env/server.ts)를 부르고 결과를 돌려준다.

export type ApproveResult = { ok: true } | { ok: false; reason: "declined" | "failed" };

export type PaymentProviderApi = {
  approve(order: { orderId: string; amountKrw: number }): Promise<ApproveResult>;
};

export const mockProvider: PaymentProviderApi = {
  async approve() {
    // 실제 결제처럼 잠깐 기다린다(화면의 "승인 중" 확인용)
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { ok: true };
  },
};
