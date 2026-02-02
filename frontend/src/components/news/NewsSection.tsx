import { useState } from 'react';
import type { NewsItem } from '@/services/types';

interface NewsSectionProps {
  news?: NewsItem[];
  isMobile?: boolean;
}

export function NewsSection({ news, isMobile = false }: NewsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!news || news.length === 0) {
    return null;
  }

  // 모바일에서는 expand/collapse 방식 사용
  if (isMobile) {
    return (
      <div className="mt-2.5 pt-2.5 border-t border-border-light">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="flex items-center justify-between w-full text-left text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <span>관련 뉴스 ({news.length})</span>
          </span>
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-[300px] opacity-100 mt-2' : 'max-h-0 opacity-0'
          }`}
        >
          <NewsItemList news={news} />
        </div>
      </div>
    );
  }

  // 데스크톱에서는 항상 표시
  return (
    <div className="mt-3 pt-3 border-t border-border-light">
      <div className="flex items-center gap-1.5 text-xs text-text-muted mb-2">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
        <span>관련 뉴스</span>
      </div>
      <NewsItemList news={news} />
    </div>
  );
}

function NewsItemList({ news }: { news: NewsItem[] }) {
  return (
    <ul className="space-y-1.5">
      {news.map((item, idx) => (
        <li key={idx} className="flex items-start gap-1.5">
          <span className="text-text-muted text-[0.65rem] mt-0.5 flex-shrink-0">•</span>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[0.7rem] text-text-secondary hover:text-accent-primary hover:underline transition-colors line-clamp-2 flex-1"
            title={item.title}
          >
            {item.title}
          </a>
          <span className="text-[0.6rem] text-text-muted flex-shrink-0 whitespace-nowrap">
            {item.pubDate}
          </span>
        </li>
      ))}
    </ul>
  );
}
