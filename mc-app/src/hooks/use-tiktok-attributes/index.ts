import { useServiceQuery } from '../use-tiktok-service';

/** The attributes TikTok defines for a category. Nothing is loaded without one. */
export const useTikTokAttributes = (categoryId: string | undefined) => {
  const { data, error, loading } = useServiceQuery(
    (client) => client.getCategoryAttributes(categoryId ?? ''),
    { enabled: Boolean(categoryId) }
  );
  return { attributes: data?.attributes ?? [], error, loading };
};
