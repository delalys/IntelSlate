/**
 * NewsBlock Component
 *
 * Renders per-article AI summaries for a stock ticker.
 */

import DOMPurify from 'isomorphic-dompurify';
import type { IArticleWithSummary } from '@/lib/api/ollama';

// =============================================================================
// Types
// =============================================================================

export interface INewsBlockProps {
  ticker: string;
  articles: IArticleWithSummary[];
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function NewsBlock({ ticker, articles, className }: INewsBlockProps) {
  const summarizedArticles = articles.filter((a) => a.summary);

  if (summarizedArticles.length === 0) {
    return null;
  }

  const containerClassName = ['flex flex-col gap-2', 'min-w-0', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <section className={containerClassName} data-testid="news-block">
      <div className="flex">
        <span
          data-testid="news-block-ticker"
          className="tag rounded-md bg-gray-400/10 px-2 py-1 text-xs font-medium text-white inline-flex items-center"
        >
          {ticker.toUpperCase()}
        </span>
      </div>
      <ul
        data-testid="news-block-list"
        className="flex flex-col gap-1 list-disc pl-3 marker:text-[0.5rem] marker:text-gray-400"
      >
        {summarizedArticles.map((article) => (
          <li
            key={`${ticker}-${article.title}`}
            className="text-sm xl:text-base leading-relaxed"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized with DOMPurify
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(article.summary ?? ''),
            }}
          />
        ))}
      </ul>
    </section>
  );
}
