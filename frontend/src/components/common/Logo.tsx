export function Logo() {
  return (
    <a
      href="#"
      onClick={(e) => { e.preventDefault(); window.location.reload(); }}
      className="flex items-center gap-2.5 no-underline cursor-pointer"
    >
      <div className="w-9 h-9 relative flex items-center justify-center">
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-hidden="true">
          {/* Solid accent background */}
          <rect x="2" y="2" width="36" height="36" rx="8" fill="#93c5fd" opacity="0.4"/>
          <rect x="5" y="5" width="30" height="30" rx="6" fill="#2563eb"/>
          {/* Pulse line */}
          <path d="M12.5 20 L17 20 L18.9 15 L20.8 25 L22.8 20 L28 20"
            stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-lg font-extrabold tracking-tight text-accent-primary">
          SignalPulse
        </span>
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          AI Stock Signal Analyzer
        </span>
      </div>
    </a>
  );
}
