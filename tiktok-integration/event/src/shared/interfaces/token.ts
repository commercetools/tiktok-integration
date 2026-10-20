/**
 * Interface for access token data stored in CommerceTools
 */
export interface AccessTokenData {
  open_id?: string;
  seller_name?: string;
  seller_base_region?: string;
  user_type?: number;
  access_token: string;
  access_token_expire_at?: number;
  refresh_token: string;
  refresh_token_expire_at?: number;
  created_at: string;
  updated_at: string;
  last_refreshed_at: string;
}

export type TokenResponse = {
  access_token: string;
  access_token_expire_in?: number;
  refresh_token: string;
  refresh_token_expire_in?: number;
  open_id?: string;
  seller_name?: string;
  seller_base_region?: string;
  request_id?: string;
};

/**
 * Interface for app-project mapping options
 */
export interface AppProjectMappingOptions {
  code?: string;
  shop_region?: string;
  locale?: string;
  seller_name?: string;
  seller_id?: string;
  code_consumed?: boolean;
  shop_id?: string;
  shop_cipher?: string;
  warehouses?: {
    id: string;
    entityId: string;
  }[];
}

/**
 * Interface for app-project mapping data
 */
export interface AppProjectMapping {
  app_key?: string;
  project_key?: string;
  service_url?: string;
  shop_id?: string;
  options?: AppProjectMappingOptions;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Interface for JWT token data stored in CommerceTools
 */
export interface JwtTokenData {
  jwt_token: string;
  expires_at: number;
  created_at: string;
  updated_at: string;
}