-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('user', 'ai');

-- CreateTable
CREATE TABLE "CaseChatMessage" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" VARCHAR(4000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseChatMessage_caseId_createdAt_idx" ON "CaseChatMessage"("caseId", "createdAt");

-- AddForeignKey
ALTER TABLE "CaseChatMessage" ADD CONSTRAINT "CaseChatMessage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 공개 API(anon 키)로 직접 읽고 쓰지 못하게 RLS를 켜고 정책은 두지 않는다. 앱은 Prisma로만 접근한다.
ALTER TABLE "CaseChatMessage" ENABLE ROW LEVEL SECURITY;
