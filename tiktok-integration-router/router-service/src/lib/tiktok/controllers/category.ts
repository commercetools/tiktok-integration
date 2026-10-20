import { client } from './client';

export const getCategories = async (
  access_token: string,
  shop_cipher: string,
  options?: {
    locale?: string;
    keyword?: string;
    categoryVersion?: string;
    listingPlatform?: string;
    includeProhibitedCategories?: boolean;
  },
) => {
  const { body } = await client.api.ProductV202309Api.CategoriesGet(
    access_token,
    'application/json',
    options?.locale,
    options?.keyword,
    options?.categoryVersion,
    options?.listingPlatform,
    options?.includeProhibitedCategories,
    shop_cipher,
  );
  if (!body?.data) {
    return [];
  }
  return body.data.categories;
};

export const getCategoryRules = async (
  access_token: string,
  category_id: string,
  shop_cipher: string,
  options?: {
    categoryVersion?: string;
    locale?: string;
  },
) => {
  const { body } =
    await client.api.ProductV202309Api.CategoriesCategoryIdRulesGet(
      category_id,
      access_token,
      'application/json',
      options?.categoryVersion,
      options?.locale,
      shop_cipher,
    );
  return body;
};

export const getCategoryAttributes = async (
  access_token: string,
  category_id: string,
  shop_cipher: string,
  options?: {
    locale?: string;
  },
) => {
  const { body } =
    await client.api.ProductV202309Api.CategoriesCategoryIdAttributesGet(
      category_id,
      access_token,
      'application/json',
      options?.locale,
      'v2',
      shop_cipher,
    );
  return body;
};
