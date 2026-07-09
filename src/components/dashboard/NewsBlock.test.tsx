/**
 * NewsBlock Component Tests
 *
 * Verifies ticker styling and per-article summary rendering.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NewsBlock } from './NewsBlock';

describe('NewsBlock', () => {
  it('renders ticker tag with uppercase styling', () => {
    render(
      <NewsBlock
        ticker="aapl"
        articles={[
          {
            title: 'Article 1',
            content: 'Content',
            summary: 'Apple earnings beat estimates',
          },
          {
            title: 'Article 2',
            content: 'Content',
            summary: 'iPhone demand strong',
          },
        ]}
      />,
    );

    const ticker = screen.getByTestId('news-block-ticker');
    expect(ticker).toHaveTextContent('AAPL');
    expect(ticker).toHaveClass('text-xs');
    expect(ticker).toHaveClass('font-bold');
    expect(ticker).toHaveClass('text-white');
  });

  it('renders per-article summaries as list items', () => {
    render(
      <NewsBlock
        ticker="MSFT"
        articles={[
          {
            title: 'Article 1',
            content: 'Content',
            summary: 'Azure growth accelerates',
          },
          {
            title: 'Article 2',
            content: 'Content',
            summary: 'Enterprise demand steady',
          },
        ]}
      />,
    );

    const list = screen.getByTestId('news-block-list');
    expect(list.tagName).toBe('UL');
    expect(list).toHaveClass('list-disc');
    expect(list).toHaveClass('pl-3');

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Azure growth accelerates');
    expect(items[1]).toHaveTextContent('Enterprise demand steady');

    items.forEach((item) => {
      expect(item).toHaveClass('text-sm');
      expect(item).toHaveClass('leading-relaxed');
    });
  });

  it('returns null when no articles have summaries', () => {
    const { container } = render(
      <NewsBlock
        ticker="TSLA"
        articles={[{ title: 'Article 1', content: 'Content' }]}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('only renders articles that have summaries', () => {
    render(
      <NewsBlock
        ticker="NVDA"
        articles={[
          {
            title: 'Article 1',
            content: 'Content',
            summary: 'AI demand surges',
          },
          { title: 'Article 2', content: 'Content' },
        ]}
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('AI demand surges');
  });
});
