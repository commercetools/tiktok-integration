import { client } from './client';

export const getBrands = async (
  access_token: string,
  shop_cipher: string,
  page?: {
    pageSize?: number;
    pageToken?: string;
  },
  options?: {
    categoryId?: string;
    isAuthorized?: boolean;
    brandName?: string;
    categoryVersion?: string;
  },
) => {
  const { body } = await client.api.ProductV202309Api.BrandsGet(
    page?.pageSize ?? 100,
    access_token,
    'application/json',
    options?.categoryId,
    options?.isAuthorized,
    options?.brandName,
    page?.pageToken,
    options?.categoryVersion,
    shop_cipher,
  );
  return body;
};
