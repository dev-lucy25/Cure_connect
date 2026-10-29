-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('ready', 'done', 'canceled', 'failed');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('mock', 'toss');

-- AlterTable
ALTER TABLE "CreditLedger" ADD COLUMN     "paymentId" TEXT;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" VARCHAR(64) NOT NULL,
    "userId" UUID NOT NULL,
    "packageId" VARCHAR(30) NOT NULL,
    "amountKrw" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'mock',
    "status" "PaymentStatus" NOT NULL DEFAULT 'ready',
    "approvedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- 금액·크레딧은 양수
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amounts_check" CHECK ("amountKrw" > 0 AND "credits" > 0);

-- 결제마다 충전(purchase)·취소(refund) 내역은 한 번씩만 (같은 주문을 여러 번 승인해도 한 번만 충전)
CREATE UNIQUE INDEX "CreditLedger_once_per_payment" ON "CreditLedger"("paymentId", "reason") WHERE "reason" IN ('purchase', 'refund');

-- 공개 API(anon 키)로 직접 읽고 쓰지 못하게 RLS를 켜고 정책은 두지 않는다. 앱은 Prisma로만 접근한다.
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
