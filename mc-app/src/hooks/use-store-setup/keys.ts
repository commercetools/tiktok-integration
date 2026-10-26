const KEY_PATTERN = /^[A-Za-z0-9_-]{2,256}$/;

/** A commercetools key derived from a display name: letters, digits, `-` and `_`. */
export const toKey = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 256);

export const isValidKey = (key: string): boolean => KEY_PATTERN.test(key);
