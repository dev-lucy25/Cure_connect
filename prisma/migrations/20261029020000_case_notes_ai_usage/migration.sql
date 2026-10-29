-- CreateTable
CREATE TABLE "CaseNote" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(60) NOT NULL,
    "ward" VARCHAR(60) NOT NULL,
    "memo" VARCHAR(2000) NOT NULL,
    "memoUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiResult" JSONB,
    "aiAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "userId" UUID NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("userId","day")
);

-- CreateIndex
CREATE INDEX "CaseNote_userId_updatedAt_id_idx" ON "CaseNote"("userId", "updatedAt" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "CaseNote" ADD CONSTRAINT "CaseNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 하루 20회 제한은 DB에서도 지킨다 (동시에 눌러도 넘지 않음)
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_count_check" CHECK ("count" BETWEEN 0 AND 20);

-- 공개 API(anon 키)로 직접 읽고 쓰지 못하게 RLS를 켜고 정책은 두지 않는다. 앱은 Prisma로만 접근한다.
ALTER TABLE "CaseNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiUsage" ENABLE ROW LEVEL SECURITY;
