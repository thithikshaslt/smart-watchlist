function Logo() {
  return (
    <span className="flex items-center gap-1.5 font-semibold tracking-tight">
      <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden>
        <rect width="48" height="48" rx="12" fill="#059669" />
        <path
          d="M9 30 L18 21 L24 27 L39 12"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="39" cy="12" r="3.5" fill="#ffffff" />
      </svg>
      Watchlyst
    </span>
  )
}

export default Logo
