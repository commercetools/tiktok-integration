/**
 * The REST contract between this app and the connector's `service`
 * (`/service/mc/*` and `/service/tiktok/*`). Keep in step with the service.
 */

export type ConnectionStatus = {
  connected: boolean;
  shop?: {
    id: string;
    name?: string;
    code?: string;
    region?: string;
  };
  /** Warehouses of the authorized shop, read from TikTok at authorization. */
  warehouses: TikTokWarehouse[];
  /** Unix seconds. */
  authorizedAt?: number;
  /** Unix seconds; the access token is renewed on its own. */
  accessTokenExpiresAt?: number;
};

export type TikTokWarehouse = {
  id: string;
  name?: string;
  type?: string;
};

export type AuthorizationLink = { url: string };

export type ActionResult = { message: string };

export type ProductCheckResult = {
  importableProducts: string[];
  unimportableProducts: { id: string; error: string }[];
};

export type AttributeTransform =
  | 'identity'
  | 'lowercase'
  | 'uppercase'
  | 'number'
  | 'boolean'
  | 'enumKeyToLabel'
  | 'localizedPick';

export type TikTokValue = {
  id?: string;
  name?: string;
};

/** Either `ctAttribute` or `constantValues`, never both. */
export type AttributeMapping = {
  /** Optional label, for display. */
  name?: string;
  tiktokAttributeId: string;
  /** Name of the commercetools attribute on the product type. */
  ctAttribute?: string;
  /** Fixed TikTok values, sent whatever the product holds. */
  constantValues?: TikTokValue[];
  /** Transformed commercetools text to the TikTok value it stands for; text with no entry is sent as free text. */
  valueMap?: Record<string, TikTokValue>;
  transform?: AttributeTransform;
};

export type ProductTypeMapping = {
  categoryId: string;
  productAttributes: AttributeMapping[];
  skuAttributes: AttributeMapping[];
};

export type MappingConfig = {
  version?: 1;
  /** Keyed by commercetools product type id. */
  productTypes: Record<string, ProductTypeMapping>;
};

export type TikTokCategory = {
  id: string;
  localName?: string;
  isLeaf?: boolean;
  parentId?: string;
};

export type TikTokAttributeValue = {
  id?: string;
  name?: string;
};

export type TikTokAttribute = {
  id: string;
  name?: string;
  /** SALES_PROPERTY or PRODUCT_PROPERTY. */
  type?: string;
  isRequired?: boolean;
  isCustomizable?: boolean;
  isMultipleSelection?: boolean;
  values?: TikTokAttributeValue[];
};

export type TikTokCategoryRules = Record<string, unknown>;
