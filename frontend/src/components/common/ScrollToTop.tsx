import { useState, useEffect } from 'react';

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const show = window.scrollY > 300;
      setVisible(show);
      if (!show) setHovered(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollToTop}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="페이지 최상단으로 이동"
      style={{
        background: hovered
          ? 'linear-gradient(135deg, rgba(37,99,235,0.7), rgba(8,145,178,0.7))'
          : 'linear-gradient(135deg, rgba(37,99,235,0.35), rgba(8,145,178,0.35))',
      }}
      className={`
        fixed bottom-6 right-6 z-50
        w-11 h-11 rounded-full
        shadow-lg shadow-blue-500/15
        flex items-center justify-center
        transition-all duration-300 ease-out
        hover:shadow-xl hover:shadow-blue-500/30 hover:scale-110
        active:scale-95
        ${visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
        }
      `}
    >
      <svg
        className="w-5 h-5 text-white"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
}
