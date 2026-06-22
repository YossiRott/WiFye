export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <svg className="h-9 w-9" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#e8a020" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
            </defs>
            <circle cx="18" cy="18" r="18" fill="url(#logoGrad)" />
            <path d="M5 17 Q11 10 18 10 Q25 10 31 17 Q25 24 18 24 Q11 24 5 17 Z" fill="rgba(255,255,255,0.15)" />
            <path d="M5 17 Q11 10 18 10 Q25 10 31 17" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <path d="M5 17 Q11 24 18 24 Q25 24 31 17" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <circle cx="18" cy="17" r="5" stroke="white" strokeWidth="1.4" fill="rgba(255,255,255,0.1)" />
            <circle cx="18" cy="17" r="2.2" fill="white" />
            <path
              d="M5 17 L3 22 Q5 27 9 25"
              stroke="white"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M31 17 L33 22 L30 26"
              stroke="white"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <div>
            <div className="text-lg font-bold leading-none text-text">Wifye</div>
            <div className="text-xs leading-none text-text-muted">WiFi Network Analyzer</div>
          </div>
        </div>
        <div className="rounded-full border border-border px-3 py-1 text-xs text-text-muted">
          pcap · pcapng · cap
        </div>
      </div>
    </header>
  );
}
