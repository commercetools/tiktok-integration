import { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk';
import { createOrUpdateCustomObject } from '../../commercetools/controllers/custom-object.controller';
import { SHARED_SHOP_CONTAINER_KEY } from '../../constants';
import { getCategoryVariableKey } from '../../utils';
import { Product202309GetCategoriesResponseDataCategories } from '../../interfaces/tiktok/models';
export const storeCategories = async (
  apiRoot: ByProjectKeyRequestBuilder,
  categories: Product202309GetCategoriesResponseDataCategories[]
) => {
  await createOrUpdateCustomObject(
    apiRoot,
    SHARED_SHOP_CONTAINER_KEY,
    getCategoryVariableKey(),
    categories
  );
};
