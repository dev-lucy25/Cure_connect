import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // 마이그레이션은 pooler(6543)를 거치면 실패하므로 직접 연결(5432)을 쓴다.
    // generate는 DB 없이도 돌아야 하므로(postinstall) 값이 없어도 설정 로드는 실패시키지 않는다.
    url: process.env.DIRECT_URL,
  },
});
