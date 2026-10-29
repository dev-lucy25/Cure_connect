-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('student', 'professor');

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'student',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE INDEX "Profile_role_idx" ON "Profile"("role");

-- Supabase는 public 스키마를 공개 API(anon 키)로 노출한다.
-- RLS를 켜고 정책을 두지 않아 브라우저에서 직접 읽고 쓰는 것을 막는다.
-- 앱은 Prisma(DB 소유자 권한)로만 접근하며, 권한 확인은 서버 코드에서 한다.
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
