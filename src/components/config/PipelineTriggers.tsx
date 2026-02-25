'use client';

/**
 * PipelineTriggers Component
 *
 * Manual trigger buttons for Stock, News, and AI Summarization pipelines.
 * Self-contained — fetches last run times and calls server actions directly.
 *
 * @module components/config/PipelineTriggers
 */

import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import {
  triggerStockRefresh,
  triggerNewsRefresh,
  triggerAllPipelines,
  getLastRunTimes,
} from '@/actions/pipelines';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';

// =============================================================================
// Types
// =============================================================================

type TPipelineKey = 'stocks' | 'news' | 'all';

interface IFeedbackMessage {
  type: 'success' | 'error';
  text: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format a date string as relative time (e.g., "3 min ago", "2 hours ago")
 */
function formatRelativeTime(
  isoString: string | null,
  t: {
    justNow: () => string;
    never: () => string;
    minAgo: (params: { count: number }) => string;
    hoursAgo: (params: { count: number }) => string;
    daysAgo: (params: { count: number }) => string;
  },
): string {
  if (!isoString) return t.never();

  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return t.justNow();

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return t.justNow();
  if (minutes < 60) return t.minAgo({ count: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t.hoursAgo({ count: hours });

  const days = Math.floor(hours / 24);
  return t.daysAgo({ count: days });
}

// =============================================================================
// Component
// =============================================================================

export function PipelineTriggers() {
  const tDashboard = useTranslations('dashboard');
  const tConfig = useTranslations('config');
  const [runningPipeline, setRunningPipeline] = useState<TPipelineKey | null>(
    null,
  );
  const [feedback, setFeedback] = useState<IFeedbackMessage | null>(null);
  const [stocksLastRun, setStocksLastRun] = useState<string | null>(null);
  const [newsLastRun, setNewsLastRun] = useState<string | null>(null);

  const isDisabled = runningPipeline !== null;

  /**
   * Fetch last run times from the server
   */
  const refreshLastRunTimes = useCallback(async () => {
    const result = await getLastRunTimes();
    if (result.success && result.data) {
      setStocksLastRun(result.data.stocksLastRun);
      setNewsLastRun(result.data.newsLastRun);
    }
  }, []);

  // Fetch last run times on mount
  useEffect(() => {
    refreshLastRunTimes();
  }, [refreshLastRunTimes]);

  // Auto-clear feedback after 5 seconds
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  /**
   * Run a pipeline action and handle feedback
   */
  const runPipeline = useCallback(
    async (
      key: TPipelineKey,
      action: () => Promise<{
        success: boolean;
        data?: {
          processed: number;
          successCount: number;
          failureCount: number;
        };
        error?: string;
      }>,
    ) => {
      setRunningPipeline(key);
      setFeedback(null);

      try {
        const result = await action();

        if (result.success && result.data) {
          setFeedback({
            type: 'success',
            text: tConfig('pipeline.processed', {
              total: result.data.processed,
              succeeded: result.data.successCount,
              failed: result.data.failureCount,
            }),
          });
        } else {
          setFeedback({
            type: 'error',
            text: result.error || tConfig('pipelineFailed'),
          });
        }
      } catch {
        setFeedback({
          type: 'error',
          text: tConfig('pipeline.unexpectedError'),
        });
      } finally {
        setRunningPipeline(null);
        await refreshLastRunTimes();
      }
    },
    [refreshLastRunTimes, tConfig],
  );

  return (
    <div className="space-y-4">
      <h3 className="section-heading">
        {tConfig('pipeline.dataRefresh')} (DEV)
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-900">
              {tConfig('pipeline.stockPrices')}
            </span>
            <p className="text-xs text-gray-500">
              {formatRelativeTime(stocksLastRun, {
                justNow: () => tDashboard('justNow'),
                never: () => tConfig('pipeline.never'),
                minAgo: (p) => tConfig('pipeline.minAgo', p),
                hoursAgo: (p) => tConfig('pipeline.hoursAgo', p),
                daysAgo: (p) => tConfig('pipeline.daysAgo', p),
              })}
            </p>
          </div>
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => runPipeline('stocks', triggerStockRefresh)}
            className="btn-primary-sm flex items-center gap-1.5"
          >
            {runningPipeline === 'stocks' && <Spinner size="sm" />}
            {tConfig('pipeline.refresh')}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-900">
              {tConfig('pipeline.newsArticles')}
            </span>
            <p className="text-xs text-gray-500">
              {formatRelativeTime(newsLastRun, {
                justNow: () => tDashboard('justNow'),
                never: () => tConfig('pipeline.never'),
                minAgo: (p) => tConfig('pipeline.minAgo', p),
                hoursAgo: (p) => tConfig('pipeline.hoursAgo', p),
                daysAgo: (p) => tConfig('pipeline.daysAgo', p),
              })}
            </p>
          </div>
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => runPipeline('news', triggerNewsRefresh)}
            className="btn-primary-sm flex items-center gap-1.5"
          >
            {runningPipeline === 'news' && <Spinner size="sm" />}
            {tConfig('pipeline.fetchNews')}
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={isDisabled}
        onClick={() => runPipeline('all', triggerAllPipelines)}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {runningPipeline === 'all' && <Spinner size="sm" />}
        {tConfig('pipeline.runAll')}
      </button>

      {/* Feedback message */}
      {feedback && (
        <Alert variant={feedback.type === 'success' ? 'success' : 'error'}>
          {feedback.text}
        </Alert>
      )}
    </div>
  );
}
