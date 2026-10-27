export const FALLBACK_PACKAGE_WEIGHT_VALUE = '1.00';
export const FALLBACK_PACKAGE_WEIGHT_UNIT = 'POUND';
export const FALLBACK_PACKAGE_DIMENSIONS_HEIGHT = '2';
export const FALLBACK_PACKAGE_DIMENSIONS_LENGTH = '2';
export const FALLBACK_PACKAGE_DIMENSIONS_WIDTH = '2';
export const FALLBACK_PACKAGE_DIMENSIONS_UNIT = 'INCH';

export const USE_NO_CHANNEL_FOR_INVENTORY_FALLBACK = false;
export const USE_NO_CHANNEL_FOR_LIST_PRICE = true;
export const USE_NO_CHANNEL_FOR_MAIN_PRICE = false;

export const ATTRIBUTE_KEY_PACKAGE_WEIGHT_UNIT = 'weightUnit';
export const ATTRIBUTE_KEY_PACKAGE_WEIGHT_VALUE = 'weightValue';
export const ATTRIBUTE_KEY_PACKAGE_DIMENSIONS_HEIGHT = 'heightValue';
export const ATTRIBUTE_KEY_PACKAGE_DIMENSIONS_LENGTH = 'lengthValue';
export const ATTRIBUTE_KEY_PACKAGE_DIMENSIONS_WIDTH = 'widthValue';
export const ATTRIBUTE_KEY_PACKAGE_DIMENSIONS_UNIT = 'dimensionUnit';

export const SUPPORTED_LOCALES_MAP: Record<string, string> = {
  en: 'en-US',
};

export const CHANNEL_PREDICATE_TIKTOK_WAREHOUSE =
  'custom(fields(isTikTokWarehouse=true))';
export const CHANNEL_PREDICATE_TIKTOK_PRICE =
  'custom(fields(isTikTokPrice=true))';

export const ORDER_CUSTOM_TYPE_KEY = 'tiktok-order-info';
