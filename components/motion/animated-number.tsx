"use client";

import { useEffect, useState } from "react";
import NumberFlow, { type Format } from "@number-flow/react";

const DEFAULT_FORMAT: Format = { maximumFractionDigits: 1 };

// 숫자가 바뀔 때 자릿수가 굴러가며 바뀐다(토스 방식). 처음 보일 때는 0에서 세어 올라간다.
// 움직임 줄이기 설정이면 NumberFlow가 알아서 바로 바뀐 값만 보여 준다.
// 화면 읽기 프로그램에는 NumberFlow가 최종 값을 이름표로 알려 준다. data-value는 최종 값 글자(검증·복사용).
export default function AnimatedNumber({
  value,
  format = DEFAULT_FORMAT,
  suffix,
  className,
}: {
  value: number;
  format?: Format;
  suffix?: string;
  className?: string;
}) {
  // 첫 그림은 0, 화면에 붙은 직후 실제 값으로 → 세어 올라가는 애니메이션
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <NumberFlow
      value={shown}
      locales="ko-KR"
      format={format}
      suffix={suffix}
      className={className}
      data-value={`${new Intl.NumberFormat("ko-KR", format).format(value)}${suffix ?? ""}`}
      willChange
      spinTiming={{ duration: 900, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}
    />
  );
}
