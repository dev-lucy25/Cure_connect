-- 크레딧 내역 종류 추가. 새 enum 값은 같은 트랜잭션에서 쓸 수 없어서 마이그레이션을 따로 둔다
ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'sale';
ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'purchase';
ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'refund';
ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'admin_adjust';
