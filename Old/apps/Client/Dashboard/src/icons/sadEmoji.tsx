function SadEmoji({ width = 24, height = 24 }: { width?: number; height?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={width}
      height={height}
      fill="currentColor"
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <circle cx="8" cy="9" r="1.5" fill="#fff" />
      <circle cx="16" cy="9" r="1.5" fill="#fff" />
      <path
        d="M16 16c-1.5-2-3.5-3-4-3s-2.5 1-4 3"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default SadEmoji
