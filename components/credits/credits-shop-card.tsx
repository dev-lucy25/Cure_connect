"use client";

import { useRouter } from "next/navigation";
import CreditShop from "@/components/credits/credit-shop";

// 크레딧 화면에 그대로 펼쳐 둔 충전소 (후기 작성하기 → 족보 쓰기 모달)
export default function CreditsShopCard() {
  const router = useRouter();
  return <CreditShop onWrite={() => router.push("/notes?write=1")} />;
}
