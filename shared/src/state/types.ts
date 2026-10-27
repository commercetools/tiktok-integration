/**
 * Connector state kept in custom fields of the Store whose custom type is `tiktok-store-type`
 * and `isTikTokShop=true`. Field names are the Store field names. Tokens are plaintext here
 * (decrypted on read, encrypted on write); they must never be logged.
 */
export interface TikTokState {
  tiktokShopId?: string;
  tiktokShopCipher?: string;
  tiktokShopName?: string;
  tiktokShopCode?: string;
  tiktokRegion?: string;
  tiktokLocale?: string;
  /** JSON string of the warehouse mapping. */
  tiktokWarehouses?: string;
  tiktokAccessToken?: string;
  tiktokRefreshToken?: string;
  /** Unix seconds. */
  tiktokAccessExpiresAt?: number;
  /** Unix seconds. */
  tiktokRefreshExpiresAt?: number;
  /** Unix seconds. */
  tiktokAuthorizedAt?: number;
  /** Unix seconds. */
  tiktokDeauthorizedAt?: number;
  /** JSON string of the declarative mapping configuration. */
  mappingConfig?: string;
}

/** A field set to `null` is cleared on the Store; `undefined` leaves it untouched. */
export type StatePatch = {
  [K in keyof TikTokState]?: TikTokState[K] | null;
};

export const STORE_TYPE_KEY = 'tiktok-store-type';

export const SECRET_FIELDS = ['tiktokAccessToken', 'tiktokRefreshToken'] as const;

export const STRING_FIELDS = [
  'tiktokShopId',
  'tiktokShopCipher',
  'tiktokShopName',
  'tiktokShopCode',
  'tiktokRegion',
  'tiktokLocale',
  'tiktokWarehouses',
  'mappingConfig',
] as const;

export const NUMBER_FIELDS = [
  'tiktokAccessExpiresAt',
  'tiktokRefreshExpiresAt',
  'tiktokAuthorizedAt',
  'tiktokDeauthorizedAt',
] as const;
