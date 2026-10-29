-- CreateEnum
CREATE TYPE "OrgPlan" AS ENUM ('free', 'pro');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "classGroup" VARCHAR(10),
ADD COLUMN     "grade" INTEGER,
ADD COLUMN     "memberNo" VARCHAR(20),
ADD COLUMN     "orgId" TEXT,
ADD COLUMN     "staffTitle" VARCHAR(30);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "shortName" VARCHAR(20) NOT NULL,
    "plan" "OrgPlan" NOT NULL DEFAULT 'free',
    "licenseUntil" TIMESTAMP(3),
    "inviteCode" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_name_key" ON "Organization"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_inviteCode_key" ON "Organization"("inviteCode");

-- CreateIndex
CREATE INDEX "Profile_orgId_role_idx" ON "Profile"("orgId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_orgId_memberNo_key" ON "Profile"("orgId", "memberNo");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- 학년은 1~4, 학번은 학교가 있을 때만 쓸 수 있다
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_grade_check" CHECK ("grade" BETWEEN 1 AND 4);
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_memberNo_needs_org" CHECK ("memberNo" IS NULL OR "orgId" IS NOT NULL);

-- 처음 지원하는 학교. 초대 코드는 여기서 무작위로 만든다 (코드 값이 git에 남지 않음).
-- 교수에게 알려줄 코드는 DB에서 확인: SELECT "name", "inviteCode" FROM "Organization";
INSERT INTO "Organization" ("id", "name", "shortName", "inviteCode") VALUES
  ('org_dit',  '동의과학대학교 간호학과', 'DIT',   upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))),
  ('org_pnu',  '부산대학교 간호대학',     '부산대', upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))),
  ('org_inje', '인제대학교 간호대학',     '인제대', upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)));

-- 초대 코드가 공개 API(anon 키)로 읽히지 않게 RLS를 켜고 정책은 두지 않는다. 앱은 Prisma로만 접근한다.
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
