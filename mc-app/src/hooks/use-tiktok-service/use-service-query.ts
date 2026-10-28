import { useCallback, useEffect, useRef, useState } from 'react';
import type { ServiceClient } from './service-client';
import { useTikTokService } from './use-tiktok-service';

type Options = {
  /** Skip loading while false. */
  enabled?: boolean;
  /** Reload on this interval, in milliseconds, while set. */
  pollMs?: number;
};

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

/**
 * Loads one resource from the service on mount (and every `pollMs`), and
 * exposes `refetch`. `load` need not be stable: the latest one is used.
 */
export const useServiceQuery = <T>(
  load: (client: ServiceClient) => Promise<T>,
  { enabled = true, pollMs }: Options = {}
) => {
  const service = useTikTokService();
  const loadRef = useRef(load);
  loadRef.current = load;
  const requestId = useRef(0);

  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [loading, setLoading] = useState(false);

  const client = service.client;

  const refetch = useCallback(async () => {
    if (!client) return;
    const id = ++requestId.current;
    setLoading(true);
    try {
      const result = await loadRef.current(client);
      if (id !== requestId.current) return;
      setData(result);
      setError(undefined);
    } catch (caught) {
      if (id !== requestId.current) return;
      setError(toError(caught));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (!enabled || !client) return undefined;
    refetch().catch(() => undefined);
    if (!pollMs) return undefined;
    const timer = setInterval(() => {
      refetch().catch(() => undefined);
    }, pollMs);
    return () => clearInterval(timer);
  }, [enabled, client, pollMs, refetch]);

  return { data, error, loading, refetch };
};
