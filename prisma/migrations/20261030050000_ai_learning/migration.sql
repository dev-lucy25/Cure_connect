-- P9 AI 학습 도구: AI 프리셉터 모의 구술질문 기록 · AI 실습일지
-- 다른 테이블과 같이 RLS를 켜고 정책은 두지 않는다(Prisma 서버 접근만)


-- CreateTable
CREATE TABLE "PreceptorAttempt" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "wardCategory" "WardCategory" NOT NULL,
    "questionKey" VARCHAR(40) NOT NULL,
    "answer" VARCHAR(1000) NOT NULL,
    "score" INTEGER NOT NULL,
    "feedback" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PreceptorAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyJournal" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "ward" VARCHAR(60) NOT NULL,
    "memo" VARCHAR(1000) NOT NULL,
    "content" VARCHAR(4000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyJournal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PreceptorAttempt_userId_createdAt_idx" ON "PreceptorAttempt"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PreceptorAttempt_wardCategory_createdAt_idx" ON "PreceptorAttempt"("wardCategory", "createdAt");

-- CreateIndex
CREATE INDEX "DailyJournal_userId_date_idx" ON "DailyJournal"("userId", "date" DESC);

-- AddForeignKey
ALTER TABLE "PreceptorAttempt" ADD CONSTRAINT "PreceptorAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyJournal" ADD CONSTRAINT "DailyJournal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- 값 범위
ALTER TABLE "PreceptorAttempt" ADD CONSTRAINT "PreceptorAttempt_score_check" CHECK ("score" BETWEEN 0 AND 100);

-- RLS (Supabase Data API로 직접 접근 차단)
ALTER TABLE "PreceptorAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyJournal" ENABLE ROW LEVEL SECURITY;
