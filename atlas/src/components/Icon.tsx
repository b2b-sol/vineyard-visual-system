import type { ReactElement, SVGProps } from "react";

export type IconName =
  | "arrow"
  | "block"
  | "calendar"
  | "check"
  | "chevron"
  | "clock"
  | "crew"
  | "history"
  | "info"
  | "layers"
  | "offline"
  | "route"
  | "spark"
  | "warning";

const paths: Record<IconName, ReactElement> = {
  arrow: <path d="m5 12 6-6 6 6m-6-6v12" />,
  block: <path d="m4 7 8-4 8 4-8 4-8-4Zm0 5 8 4 8-4M4 17l8 4 8-4" />,
  calendar: (
    <path d="M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm3 8h3v3H8v-3Z" />
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  clock: <path d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  crew: (
    <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a3 3 0 1 0 0-6M2 20c0-4 2.7-6 6-6s6 2 6 6m1-6c3 0 5 2 5 5" />
  ),
  history: <path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6M12 7v5l3 2" />,
  info: <path d="M12 16v-5m0-3v-.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  layers: <path d="m3 7 9-4 9 4-9 4-9-4Zm2 5 7 3 7-3m-14 5 7 3 7-3" />,
  offline: (
    <path d="m3 3 18 18M8.4 8.5A8.8 8.8 0 0 1 12 7.7c3.5 0 6.6 2 8 4.3m-4 3.1A5.7 5.7 0 0 0 12 13.5m-8-1.6a9.6 9.6 0 0 1 1.9-2.3M12 19h.01" />
  ),
  route: (
    <path d="M5 5h7m0 0L9 2m3 3L9 8m10 11h-7m0 0 3-3m-3 3 3 3M5 5v3c0 2 1 3 3 3h8c2 0 3 1 3 3v5" />
  ),
  spark: (
    <path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2Zm7 13 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
  ),
  warning: (
    <path d="M12 8v5m0 3h.01M10.3 3.8 2.7 18a2 2 0 0 0 1.8 3h15a2 2 0 0 0 1.8-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
  ),
};

export function Icon({
  name,
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
      {...props}
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      >
        {paths[name]}
      </g>
    </svg>
  );
}
