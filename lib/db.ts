import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// 개발 중 핫리로드마다 커넥션 풀이 새로 생기지 않도록 전역에 하나만 둔다.
// 단, `prisma generate`로 클라이언트 코드가 바뀌면(새 테이블 추가 등) 옛 인스턴스는 새 테이블을 모르므로
// 클래스가 달라졌을 때는 옛 것을 닫고 새로 만든다.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaClass?: typeof PrismaClient };

function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // pg 기본값은 10초 쉰 연결을 닫는다. DB(파리)와 새 연결을 맺는 데 2~3초가 걸려
    // 화면을 잠깐 보다 탭을 누르면 멈칫했다 → 쉬는 연결을 10분 유지하고 keep-alive로 끊김을 막는다.
    idleTimeoutMillis: 10 * 60_000,
    keepAlive: true,
  });
  return new PrismaClient({ adapter });
}

function getDb() {
  const cached = globalForPrisma.prisma;
  if (cached && globalForPrisma.prismaClass === PrismaClient) return cached;
  void cached?.$disconnect();
  const fresh = createClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = fresh;
    globalForPrisma.prismaClass = PrismaClient;
  }
  return fresh;
}

export const db = getDb();
