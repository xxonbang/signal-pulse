import { useState, useEffect } from 'react';

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 300);
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
      aria-label="페이지 최상단으로 이동"
      className={`
        fixed bottom-6 right-6 z-50
        w-11 h-11 rounded-full
        bg-white/80 dark:bg-gray-800/80
        backdrop-blur-md
        border border-gray-200/60 dark:border-gray-700/60
        shadow-lg shadow-black/5
        flex items-center justify-center
        transition-all duration-300 ease-out
        hover:bg-white hover:shadow-xl hover:scale-110
        hover:border-accent-primary/40
        active:scale-95
        ${visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
        }
      `}
    >
      <svg
        className="w-5 h-5 text-gray-500 transition-colors duration-200 group-hover:text-accent-primary"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
}
