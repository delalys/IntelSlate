'use client';

/**
 * ThemeSettings — theme selector for Config modal
 */

import { useTranslations } from 'next-intl';
import { THEME_IDS, type TThemeId } from '@/theme-engine/types';
import { Select } from '@/components/ui/Select';

export interface IThemeSettingsProps {
  themeId: TThemeId;
  onChange: (id: TThemeId) => void;
}

const THEME_ID_TO_I18N_KEY: Record<TThemeId, string> = {
  default: 'default',
  'retro-ink': 'retroInk',
};

export function ThemeSettings({ themeId, onChange }: IThemeSettingsProps) {
  const t = useTranslations('config.theme');

  return (
    <div className="space-y-2">
      <label htmlFor="theme-select" className="field-label">
        {t('title')}
      </label>
      <Select
        id="theme-select"
        value={themeId}
        onChange={(e) => onChange(e.target.value as TThemeId)}
        data-testid="theme-select"
      >
        {THEME_IDS.map((id) => (
          <option key={id} value={id}>
            {t(THEME_ID_TO_I18N_KEY[id])}
          </option>
        ))}
      </Select>
    </div>
  );
}
