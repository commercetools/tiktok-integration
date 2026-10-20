import { useState } from 'react';
import { useServiceFetcher } from '../use-connect-fetcher';

/**
 * TikTok attribute value structure
 */
export interface TikTokAttributeValue {
  id?: string;
  name?: string;
  iconUrl?: string;
}

/**
 * TikTok attribute structure
 */
export interface TikTokAttribute {
  id?: string;
  name?: string;
  type?: string; // SALES_PROPERTY or PRODUCT_PROPERTY
  isRequired?: boolean;
  isCustomizable?: boolean;
  isMultipleSelection?: boolean;
  values?: TikTokAttributeValue[];
  valueDataFormat?: string;
}

/**
 * TikTok get attributes response
 */
export interface TikTokGetAttributesResponse {
  code?: number;
  message?: string;
  requestId?: string;
  data?: {
    attributes?: TikTokAttribute[];
  };
}

/**
 * Hook to fetch TikTok attributes for a specific category
 */
export const useTikTokAttributes = () => {
  const [attributes, setAttributes] = useState<TikTokAttribute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { getCategoryAttributes } = useServiceFetcher();
  const fetchAttributes = async (categoryId: string) => {
    if (!categoryId) {
      setError(new Error('Category ID is required'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getCategoryAttributes(categoryId);
      setAttributes(response.data?.attributes || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return {
    attributes,
    loading,
    error,
    fetchAttributes,
  };
};
