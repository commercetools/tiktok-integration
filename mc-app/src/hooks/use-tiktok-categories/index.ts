import { useMemo } from 'react';
import { useServiceQuery } from '../use-tiktok-service';

export const useTikTokCategories = () => {
  const { data, error, loading, refetch } = useServiceQuery((client) =>
    client.getCategories()
  );
  const categories = data?.categories;
  const leafCategories = useMemo(
    () => (categories ?? []).filter((category) => category.isLeaf),
    [categories]
  );
  return {
    categories: categories ?? [],
    leafCategories,
    error,
    loading,
    refetch,
  };
};
