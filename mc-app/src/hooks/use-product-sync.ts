import { useCallback, useState } from 'react';
import { useTikTokService } from './use-tiktok-service';

/** Product synchronization actions; `busy` is true while one is running. */
export const useProductSync = () => {
  const service = useTikTokService();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async <T>(
      action: (client: NonNullable<typeof service.client>) => Promise<T>
    ) => {
      if (!service.client)
        throw new Error('The TikTok service is not configured.');
      setBusy(true);
      try {
        return await action(service.client);
      } finally {
        setBusy(false);
      }
    },
    [service.client]
  );

  return {
    busy,
    fullProductCheck: () => run((client) => client.fullProductCheck()),
    fullProductSync: () => run((client) => client.fullProductSync()),
    selectiveProductSync: (productIds: string[]) =>
      run((client) => client.selectiveProductSync(productIds)),
    shopConfigSync: () => run((client) => client.shopConfigSync()),
  };
};
