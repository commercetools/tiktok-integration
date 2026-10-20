import { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk/dist/declarations/src/generated/client/by-project-key-request-builder';
import { CustomObject } from '@commercetools/platform-sdk';
import { logger } from '../../utils/logger';

export const createOrUpdateCustomObject = async <T = any>(
  apiRoot: ByProjectKeyRequestBuilder,
  container: string,
  key: string,
  value: T
): Promise<CustomObject> => {
  try {
    const response = await apiRoot
      .customObjects()
      .post({
        body: {
          container,
          key,
          value,
        },
      })
      .execute();

    return response.body;
  } catch (error) {
    logger.error(
      `Error creating/updating custom object [${container}/${key}]:`,
      error
    );
    throw error;
  }
};

export const readCustomObject = async <T = any>(
  apiRoot: ByProjectKeyRequestBuilder,
  container: string,
  key: string
): Promise<T | null> => {
  try {
    const response = await apiRoot
      .customObjects()
      .withContainerAndKey({ container, key })
      .get()
      .execute();

    return response.body.value as T;
  } catch (error: any) {
    if (error.statusCode === 404) {
      return null;
    }
    logger.error(`Error reading custom object [${container}/${key}]:`, error);
    throw error;
  }
};

export const deleteCustomObject = async (
  apiRoot: ByProjectKeyRequestBuilder,
  container: string,
  key: string
): Promise<boolean> => {
  try {
    // First get the object to get its version
    const response = await apiRoot
      .customObjects()
      .withContainerAndKey({ container, key })
      .get()
      .execute();

    // Then delete it with the version
    await apiRoot
      .customObjects()
      .withContainerAndKey({ container, key })
      .delete({
        queryArgs: {
          version: response.body.version,
        },
      })
      .execute();

    return true;
  } catch (error: any) {
    if (error.statusCode === 404) {
      return false;
    }
    logger.error(`Error deleting custom object [${container}/${key}]:`, error);
    throw error;
  }
};
