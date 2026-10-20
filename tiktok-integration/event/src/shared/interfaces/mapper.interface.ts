/**
 * Stored SKU attribute mapper with base64-encoded function strings
 */
export interface StoredTikTokSkuAttributeMapper {
  name: string;
  tiktokAttributeId: string;
  valueNameFetcher?: string; // Base64 encoded function string
  valueIdFetcher?: string; // Base64 encoded function string
}

/**
 * Stored product attribute mapper with base64-encoded function strings
 */
export interface StoredTikTokProductAttributeMapper {
  name: string;
  tiktokAttributeId: string;
  valueNamesFetcher?: string; // Base64 encoded function string
  valueIdsFetcher?: string; // Base64 encoded function string
}

/**
 * Runtime SKU attribute mapper with actual functions
 */
export interface TikTokSkuAttributeMapper {
  name: string;
  tiktokAttributeId: string;
  valueNameFetcher?: Function;
  valueIdFetcher?: Function;
}

/**
 * Runtime product attribute mapper with actual functions
 */
export interface TikTokProductAttributeMapper {
  name: string;
  tiktokAttributeId: string;
  valueNamesFetcher?: Function;
  valueIdsFetcher?: Function;
}

/**
 * Product type to TikTok category mapping
 */
export type ProductTypeToCategoryMap = Record<string, string>;

/**
 * Product type to SKU attribute mapping (stored format)
 */
export type StoredProductTypeToSkuAttributeMap = Record<
  string,
  StoredTikTokSkuAttributeMapper[]
>;

/**
 * Product type to product attribute mapping (stored format)
 */
export type StoredProductTypeToProductAttributeMap = Record<
  string,
  StoredTikTokProductAttributeMapper[]
>;

/**
 * Product type to SKU attribute mapping (runtime format)
 */
export type ProductTypeToSkuAttributeMap = Record<
  string,
  TikTokSkuAttributeMapper[]
>;

/**
 * Product type to product attribute mapping (runtime format)
 */
export type ProductTypeToProductAttributeMap = Record<
  string,
  TikTokProductAttributeMapper[]
>;

