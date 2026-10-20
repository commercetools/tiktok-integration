import { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk';

export const findChannel = async (
  apiRoot: ByProjectKeyRequestBuilder,
  query: string[]
) => {
  const channels = await apiRoot
    .channels()
    .get({
      queryArgs: {
        where: query.join(' AND '),
      },
    })
    .execute();
  return channels.body.results;
};
