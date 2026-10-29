-- CreateEnum
CREATE TYPE "NoteCategory" AS ENUM ('adult', 'critical', 'maternal_child', 'psych_community');

-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('published', 'hidden');

-- DropForeignKey
ALTER TABLE "WardNoteLike" DROP CONSTRAINT "WardNoteLike_noteId_fkey";

-- DropForeignKey
ALTER TABLE "WardNoteLike" DROP CONSTRAINT "WardNoteLike_userId_fkey";

-- DropIndex
DROP INDEX "WardNote_createdAt_id_idx";

-- AlterTable
ALTER TABLE "CreditLedger" ADD COLUMN     "counterpartyId" UUID;

-- AlterTable
ALTER TABLE "Profile" ALTER COLUMN "credits" SET DEFAULT 300;

-- AlterTable
ALTER TABLE "WardNote" DROP COLUMN "likeCount",
ADD COLUMN     "category" "NoteCategory" NOT NULL,
ADD COLUMN     "price" INTEGER NOT NULL DEFAULT 300,
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ratingSum" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "salesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "NoteStatus" NOT NULL DEFAULT 'published';

-- DropTable
DROP TABLE "WardNoteLike";

-- CreateTable
CREATE TABLE "WardNoteRating" (
    "userId" UUID NOT NULL,
    "noteId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WardNoteRating_pkey" PRIMARY KEY ("userId","noteId")
);

-- CreateIndex
CREATE INDEX "WardNoteRating_noteId_idx" ON "WardNoteRating"("noteId");

-- CreateIndex
CREATE INDEX "WardNote_status_createdAt_id_idx" ON "WardNote"("status", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "WardNote_category_createdAt_idx" ON "WardNote"("category", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WardNote_salesCount_idx" ON "WardNote"("salesCount" DESC);

-- AddForeignKey
ALTER TABLE "WardNoteRating" ADD CONSTRAINT "WardNoteRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WardNoteRating" ADD CONSTRAINT "WardNoteRating_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "WardNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- 값 범위: 가격은 0(무료)·300·500만, 판매 수·평점 합계는 0 이상, 평점은 1~5
ALTER TABLE "WardNote" ADD CONSTRAINT "WardNote_price_check" CHECK ("price" IN (0, 300, 500));
ALTER TABLE "WardNote" ADD CONSTRAINT "WardNote_counts_check" CHECK ("salesCount" >= 0 AND "ratingSum" >= 0 AND "ratingCount" >= 0);
ALTER TABLE "WardNoteRating" ADD CONSTRAINT "WardNoteRating_score_check" CHECK ("score" BETWEEN 1 AND 5);

-- 판매 수익(sale)은 (산 사람, 족보)마다 한 번만 기록된다 (연타·재시도에도 중복 적립 없음)
CREATE UNIQUE INDEX "CreditLedger_one_sale_per_buyer" ON "CreditLedger"("counterpartyId", "noteId") WHERE "reason" = 'sale';

-- 크레딧 단위 변경(가입 3 → 300): 기존 잔액을 100배로 환산하고, 늘어난 만큼을 내역에 남긴다 (잔액 = 내역 합계 유지)
INSERT INTO "CreditLedger" ("id", "userId", "delta", "reason")
SELECT 'adjust_x100_' || "id"::text, "id", "credits" * 99, 'admin_adjust' FROM "Profile" WHERE "credits" > 0;
UPDATE "Profile" SET "credits" = "credits" * 100;

-- 공개 API(anon 키)로 직접 읽고 쓰지 못하게 RLS를 켜고 정책은 두지 않는다. 앱은 Prisma로만 접근한다.
ALTER TABLE "WardNoteRating" ENABLE ROW LEVEL SECURITY;
