import { useServiceQuery } from '../use-tiktok-service';

/** The TikTok connection of this deployment; `pollMs` follows it while authorizing. */
export const useConnectionStatus = (pollMs?: number) => {
  const { data, error, loading, refetch } = useServiceQuery(
    (client) => client.getConnectionStatus(),
    { pollMs }
  );
  return { status: data, error, loading, refetch };
};
