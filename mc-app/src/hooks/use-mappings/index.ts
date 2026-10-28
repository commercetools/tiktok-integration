import { useCallback, useState } from 'react';
import {
  useServiceQuery,
  useTikTokService,
  type MappingConfig,
} from '../use-tiktok-service';

const EMPTY: MappingConfig = { productTypes: {} };

export const useMappings = () => {
  const service = useTikTokService();
  const { data, error, loading, refetch } = useServiceQuery((client) =>
    client.getMappings()
  );
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (mappings: MappingConfig) => {
      if (!service.client)
        throw new Error('The TikTok service is not configured.');
      setSaving(true);
      try {
        await service.client.putMappings(mappings);
        await refetch();
      } finally {
        setSaving(false);
      }
    },
    [service.client, refetch]
  );

  return { mappings: data ?? EMPTY, error, loading, saving, save };
};
