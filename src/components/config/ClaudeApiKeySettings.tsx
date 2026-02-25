'use client';

/**
 * Claude API Key Settings
 *
 * Input to set or clear the Claude API key stored in the DB.
 * When set, the pipeline uses Claude for summarization instead of Ollama.
 * Key is never displayed; only "Key is set" status is shown.
 */

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { saveClaudeApiKey } from '@/actions/claude-api-key';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

export interface IClaudeApiKeySettingsProps {
  /** Whether a key is already stored (server does not send the key) */
  isSet: boolean;
  /** Called after key is saved so parent can refetch status */
  onSaved?: () => void;
}

export function ClaudeApiKeySettings({
  isSet,
  onSaved,
}: IClaudeApiKeySettingsProps) {
  const t = useTranslations('config.claudeApiKey');
  const [value, setValue] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSaveKey = () => {
    startTransition(async () => {
      await saveClaudeApiKey(value);
      setValue('');
      onSaved?.();
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="section-heading">{t('title')}</h3>
      <p className="text-sm text-gray-400">{t('description')}</p>
      {isSet && (
        <p className="text-xs text-green-400" data-testid="claude-key-status">
          {t('keyIsSet')}
        </p>
      )}
      <div className="flex gap-2">
        <Input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('placeholder')}
          disabled={isPending}
          data-testid="claude-api-key-input"
          aria-label={t('placeholder')}
        />
        <button
          type="button"
          onClick={handleSaveKey}
          disabled={isPending}
          className="btn-primary flex items-center gap-2 min-w-24"
          data-testid="claude-api-key-save"
        >
          {isPending && <Spinner size="sm" />}
          {isPending ? t('saving') : t('saveKey')}
        </button>
      </div>
    </div>
  );
}
