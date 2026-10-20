import {
  SHARED_SHOP_ACCESS_TOKEN_VARIABLE_KEY,
  SHARED_SHOP_CATEGORY_VARIABLE_KEY,
  SHARED_SHOP_CONFIGURATION_VARIABLE_KEY,
  SHARED_SHOP_JWT_TOKEN_VARIABLE_KEY,
} from '../constants';

export const getAccessTokenVariableKey = () => {
  return SHARED_SHOP_ACCESS_TOKEN_VARIABLE_KEY;
};

export const getConfigurationVariableKey = () => {
  return SHARED_SHOP_CONFIGURATION_VARIABLE_KEY;
};

export const getCategoryVariableKey = () => {
  return SHARED_SHOP_CATEGORY_VARIABLE_KEY;
};

export const getJwtTokenVariableKey = () => {
  return SHARED_SHOP_JWT_TOKEN_VARIABLE_KEY;
};

export const getVerifiedShopKey = (app_key: string, seller_name?: string) => {
  return `verified_${app_key}${seller_name ? `_${seller_name}` : ''}`;
};

export const getAccessTokenDocumentId = (
  app_key: string,
  seller_name?: string,
) => {
  return `${app_key}${seller_name ? `_${seller_name}` : ''}_access_token`;
};

export const getConfigurationDocumentId = (
  app_key: string,
  seller_name?: string,
) => {
  return `${app_key}${seller_name ? `_${seller_name}` : ''}_configuration`;
};

export const getCategoryDocumentId = (
  app_key: string,
  seller_name?: string,
) => {
  return `${app_key}${seller_name ? `_${seller_name}` : ''}_categories`;
};
