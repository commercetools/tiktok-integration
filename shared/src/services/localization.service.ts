import { SUPPORTED_LOCALES_MAP } from '../constants';
import { readState } from '../state';

export const normalizeLocale = (locale: string): string =>
  SUPPORTED_LOCALES_MAP[locale] || locale;

/** The commercetools locale configured for the connected TikTok shop. */
export const getCommercetoolsLocale = async (): Promise<string> => {
  const state = await readState();
  if (!state?.tiktokLocale) {
    throw new Error('No locale found');
  }
  return normalizeLocale(state.tiktokLocale);
};
