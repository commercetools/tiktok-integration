import { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk/dist/declarations/src/generated/client/by-project-key-request-builder';
import {
  SHARED_SHOP_CONTAINER_KEY,
  SHARED_SHOP_SERVICE_URL_VARIABLE_KEY,
} from '../../constants';
import { readCustomObject } from '../../commercetools/controllers/custom-object.controller';

export async function createServiceURLStorageLink(
  apiRoot: ByProjectKeyRequestBuilder,
  applicationUrl: string
): Promise<void> {
  await apiRoot
    .customObjects()
    .post({
      body: {
        key: SHARED_SHOP_SERVICE_URL_VARIABLE_KEY,
        container: SHARED_SHOP_CONTAINER_KEY,
        value: applicationUrl,
      },
    })
    .execute();
}


