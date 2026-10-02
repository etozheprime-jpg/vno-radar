export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="VNO Radar">
      <rect width="64" height="64" rx="15" fill="#0d1630" />
      <g fill="none" stroke="#5b8cff" strokeWidth="4" strokeLinecap="round">
        <path d="M10 44a24 24 0 0 1 44 0" opacity=".4" />
        <path d="M17 44a16 16 0 0 1 30 0" opacity=".7" />
        <path d="M24 44a8 8 0 0 1 16 0" />
      </g>
      <g transform="translate(32 30) rotate(-35) scale(.22)" fill="#fff"><path d="M0-92c10 0 16 8 16 20v52l78 46v22l-78-22v44l26 20v18l-42-10-42 10v-18l26-20v-44l-78 22v-22l78-46v-52c0-12 6-20 16-20z" /></g>
    </svg>
  );
}
