// 너스패스 크레딧 표시: 민트 동전 위에 거북이 등껍질(육각형) 무늬. 이모지 💎 대신 어디서나 같은 모양으로 보인다.
// 색은 디자인 토큰이라 다크 모드에서도 맞춰진다. 옆에 "C"·숫자가 있으므로 장식(aria-hidden)이다.
export default function CreditMark({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className={`inline-block shrink-0 ${className}`}>
      <circle cx="12" cy="12" r="10" fill="var(--color-brand)" stroke="var(--color-brand-deep)" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="7.2" fill="none" stroke="var(--color-brand-deep)" strokeWidth="1" opacity="0.35" />
      <path
        d="M12 7.6l3.8 2.2v4.4L12 16.4l-3.8-2.2V9.8z"
        fill="var(--color-brand-soft)"
        stroke="var(--color-brand-deep)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M6.4 9.2a6.4 6.4 0 0 1 3.2-3.4" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
