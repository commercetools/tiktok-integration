import { useState, useEffect } from 'react';
import { useServiceFetcher } from '../use-connect-fetcher';

/**
 * TikTok category structure
 */
export interface TikTokCategory {
  id?: string;
  localName?: string;
  isLeaf?: boolean;
  parentId?: string;
  permissionStatuses?: Array<{
    platform?: string;
    status?: string;
  }>;
}

/**
 * Hook to fetch TikTok categories
 */
export const useTikTokCategories = () => {
  const [categories, setCategories] = useState<TikTokCategory[]>([]);
  const [leafCategories, setLeafCategories] = useState<TikTokCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { getCategories } = useServiceFetcher();
  const fetchCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getCategories();
      const data: TikTokCategory[] = result;
      setCategories(data);

      // Filter to get only leaf categories
      const leaves = data.filter((cat) => cat.isLeaf === true);
      setLeafCategories(leaves);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    leafCategories,
    loading,
    error,
    refetch: fetchCategories,
  };
};
