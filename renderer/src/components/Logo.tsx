export function Logo({ size = 28 }: { size?: number }) {
  // Stylised "F" mark in Forgen blue.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#608afa" />
          <stop offset="1" stopColor="#2f4fc7" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#fg)" />
      <path d="M10 8h12v4h-8v4h7v4h-7v8h-4V8z" fill="#fff" />
    </svg>
  );
}
