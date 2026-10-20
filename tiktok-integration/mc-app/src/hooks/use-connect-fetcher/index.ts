import {
  buildApiUrl,
  executeHttpClientRequest,
} from '@commercetools-frontend/application-shell';
import createHttpUserAgent from '@commercetools/http-user-agent';
import { useCallback } from 'react';
import { useServiceUrl } from '../../contexts';

// Create user agent for HTTP requests
const userAgent = createHttpUserAgent({
  name: 'test-client',
  version: '1.0.0',
});

type FetcherMethods = {
  [key: string]: (...args: any[]) => Promise<any>;
};

const createFetcher = (serviceUrl: string | undefined): FetcherMethods => {
  const makeRequest = async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    try {
      // In production, use the commercetools proxy pattern
      const requestConfig: any = {
        userAgent,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        } as Record<string, string>,
        forwardToConfig: {
          uri: `${serviceUrl}${endpoint}`,
        },
      };

      if (options.body) {
        requestConfig.body = options.body;
      }

      if (options.method) {
        requestConfig.method = options.method;
      }

      const data = await executeHttpClientRequest(
        async (requestOptions: any) => {
          const res = await fetch(
            buildApiUrl('/proxy/forward-to'),
            requestOptions
          );
          const responseData = await res.json();
          return {
            data: responseData,
            statusCode: res.status,
            getHeader: (key: string) => res.headers.get(key),
          };
        },
        requestConfig
      );
      return data as T;
    } catch (error) {
      if (error && typeof error === 'object' && 'success' in error) {
        throw error;
      }
      throw {
        success: false,
        error: 'Request failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as any;
    }
  };

  return {
    getCategories: async (): Promise<any> => {
      console.log('getCategories', serviceUrl);

      return makeRequest<any>('tiktok/categories', {
        method: 'GET',
      });
    },
    getCategoryAttributes: async (categoryId: string): Promise<any> => {
      return makeRequest<any>(`tiktok/categories/${categoryId}/attributes`, {
        method: 'GET',
      });
    },
  };
};

/**
 * React hook to access chat service methods
 * Follows the commercetools connector pattern
 */
export const useServiceFetcher = () => {
  const { serviceUrl } = useServiceUrl();

  const fetcher = createFetcher(serviceUrl);

  // Create session connector
  const getCategories = useCallback(async () => {
    return await fetcher.getCategories();
  }, [fetcher]);

  const getCategoryAttributes = useCallback(
    async (categoryId: string) => {
      return await fetcher.getCategoryAttributes(categoryId);
    },
    [fetcher]
  );

  return {
    getCategories,
    getCategoryAttributes,
  };
};
