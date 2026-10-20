import { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk';

export const findStore = async (
  apiRoot: ByProjectKeyRequestBuilder,
  query: string[],
) => {
  const stores = await apiRoot
    .stores()
    .get({
      queryArgs: {
        where: query.join(' AND '),
      },
    })
    .execute();
  return stores.body.results;
};
