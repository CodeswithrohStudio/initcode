"use client";

import { useId } from "react";

interface ICLogoProps {
  className?: string;
}

export function ICLogo({ className = "" }: ICLogoProps) {
  const uid = useId().replace(/:/g, "");
  const pid = `p${uid}`;
  const cid = `c${uid}`;
  return (
    <svg
      viewBox="0 0 66 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <pattern
          id={pid}
          patternUnits="userSpaceOnUse"
          width="7"
          height="7"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="7" stroke="currentColor" strokeWidth="1.3" />
        </pattern>
        <clipPath id={cid}>
          <rect x="1" y="1" width="11" height="42" />
          <rect x="17" y="1" width="47" height="12" />
          <rect x="17" y="1" width="12" height="42" />
          <rect x="17" y="31" width="47" height="12" />
        </clipPath>
      </defs>
      <rect x="0" y="0" width="66" height="44" fill={`url(#${pid})`} clipPath={`url(#${cid})`} />
      <rect x="1" y="1" width="11" height="42" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M17 1h47v12H29V31h35v12H17z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
    </svg>
  );
}
