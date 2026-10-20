import {
  ByProjectKeyRequestBuilder,
  InventoryEntry,
} from '@commercetools/platform-sdk';

export const getInventorybyId = async (
  apiRoot: ByProjectKeyRequestBuilder,
  id: string,
): Promise<InventoryEntry | null> => {
  return apiRoot
    .inventory()
    .withId({ ID: id })
    .get()
    .execute()
    .then((response) => response.body)
    .catch(() => null);
};
