import Link from "next/link";
import NurseTurtle from "@/components/mascot/nurse-turtle";

const LINKS = [
  { href: "/tools", label: "실습 도구" },
  { href: "/notes", label: "선배 족보" },
  { href: "/me", label: "내 정보" },
];

// 모든 화면 맨 아래: 서비스 한 줄 소개 · 안전 안내(학습 보조, 환자 식별 정보 금지) · 바로가기
export default function AppFooter() {
  return (
    <footer className="mt-12 border-t border-line pt-6 pb-2 text-caption text-ink-soft">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-2.5">
          <NurseTurtle stage={2} size={36} decorative still />
          <div>
            <p className="font-brand text-body text-ink">NursePass</p>
            <p>간호학과 임상실습 1,000시간 기록 · SOAPIE AI 도우미 · 선배 족보</p>
          </div>
        </div>
        <nav aria-label="바닥 바로가기" className="flex flex-wrap gap-x-4 gap-y-1">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="inline-flex min-h-11 items-center hover:text-ink md:min-h-0">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="mt-4 leading-relaxed">
        학습을 돕는 도구예요. AI 정리와 계산 결과는 참고용이고, 실제 판단·처치는 지도간호사와 교수님 지시를 따르세요. 환자의 이름·등록번호
        같은 식별 정보는 입력하지 마세요.
      </p>
      <p className="mt-2">© 2026 NursePass</p>
    </footer>
  );
}
