export function Logo() {
  return (
    <a
      href="#"
      onClick={(e) => { e.preventDefault(); window.location.reload(); }}
      className="flex items-center gap-2.5 no-underline cursor-pointer"
    >
      <div className="w-9 h-9 relative flex items-center justify-center">
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id="logoFill" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e3a8a"/>
              <stop offset="100%" stopColor="#2563eb"/>
            </linearGradient>
          </defs>
          {/* Back layer */}
          <rect x="2" y="2" width="36" height="36" rx="8" fill="#bfdbfe" opacity="0.5"/>
          {/* Middle layer */}
          <rect x="4.5" y="4.5" width="31" height="31" rx="6.5" fill="#60a5fa" opacity="0.45"/>
          {/* Front layer */}
          <rect x="7" y="7" width="26" height="26" rx="5" fill="url(#logoFill)"/>
          {/* Pulse line */}
          <path d="M12.5 20 L17 20 L18.9 15 L20.8 25 L22.8 20 L28 20"
            stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-lg font-extrabold tracking-tight bg-gradient-to-br from-[#1e3a8a] via-accent-primary to-accent-secondary bg-clip-text text-transparent">
          SignalPulse
        </span>
        <span className="text-[0.6rem] font-medium text-text-muted uppercase tracking-wider">
          AI Stock Signal Analyzer
        </span>
      </div>
    </a>
  );
}
