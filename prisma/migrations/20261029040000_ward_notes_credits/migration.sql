-- CreateEnum
CREATE TYPE "CreditReason" AS ENUM ('signup', 'upload', 'unlock', 'delete_note');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "WardNote" (
    "id" TEXT NOT NULL,
    "authorId" UUID NOT NULL,
    "hospital" VARCHAR(60) NOT NULL,
    "ward" VARCHAR(60) NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "questions" TEXT[],
    "supplies" TEXT[],
    "atmosphere" VARCHAR(500) NOT NULL DEFAULT '',
    "tips" TEXT[],
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WardNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WardNoteUnlock" (
    "userId" UUID NOT NULL,
    "noteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WardNoteUnlock_pkey" PRIMARY KEY ("userId","noteId")
);

-- CreateTable
CREATE TABLE "WardNoteLike" (
    "userId" UUID NOT NULL,
    "noteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WardNoteLike_pkey" PRIMARY KEY ("userId","noteId")
);

-- CreateTable
CREATE TABLE "CreditLedger" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "CreditReason" NOT NULL,
    "noteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WardNote_createdAt_id_idx" ON "WardNote"("createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "WardNote_ward_createdAt_idx" ON "WardNote"("ward", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WardNote_authorId_idx" ON "WardNote"("authorId");

-- CreateIndex
CREATE INDEX "WardNoteUnlock_noteId_idx" ON "WardNoteUnlock"("noteId");

-- CreateIndex
CREATE INDEX "WardNoteLike_noteId_idx" ON "WardNoteLike"("noteId");

-- CreateIndex
CREATE INDEX "CreditLedger_userId_createdAt_idx" ON "CreditLedger"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "WardNote" ADD CONSTRAINT "WardNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WardNoteUnlock" ADD CONSTRAINT "WardNoteUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WardNoteUnlock" ADD CONSTRAINT "WardNoteUnlock_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "WardNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WardNoteLike" ADD CONSTRAINT "WardNoteLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WardNoteLike" ADD CONSTRAINT "WardNoteLike_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "WardNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 크레딧은 0 미만이 될 수 없다 (동시에 여러 번 열어도 음수가 되지 않게 DB에서 막음)
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_credits_check" CHECK ("credits" >= 0);
ALTER TABLE "WardNote" ADD CONSTRAINT "WardNote_likeCount_check" CHECK ("likeCount" >= 0);

-- 같은 족보에 대한 올리기 보상(+2)·회수(-2)는 한 번씩만 기록된다 (연타·재시도에도 중복 없음)
CREATE UNIQUE INDEX "CreditLedger_once_per_note" ON "CreditLedger"("userId", "reason", "noteId") WHERE "reason" IN ('upload', 'unlock', 'delete_note');

-- 기존 사용자에게 가입 크레딧(3) 내역을 남긴다 (잔액 = 내역 합계가 되도록)
INSERT INTO "CreditLedger" ("id", "userId", "delta", "reason")
SELECT 'signup_' || "id"::text, "id", 3, 'signup' FROM "Profile";

-- 새 프로필이 생기면(가입·시드·자동 생성 어디서든) 가입 크레딧 내역을 자동으로 남긴다
CREATE FUNCTION "credit_signup_ledger"() RETURNS trigger AS $$
BEGIN
  INSERT INTO "CreditLedger" ("id", "userId", "delta", "reason") VALUES ('signup_' || NEW."id"::text, NEW."id", NEW."credits", 'signup');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "Profile_signup_credit" AFTER INSERT ON "Profile" FOR EACH ROW EXECUTE FUNCTION "credit_signup_ledger"();

-- 공개 API(anon 키)로 직접 읽고 쓰지 못하게 RLS를 켜고 정책은 두지 않는다. 앱은 Prisma로만 접근한다.
ALTER TABLE "WardNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WardNoteUnlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WardNoteLike" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreditLedger" ENABLE ROW LEVEL SECURITY;
