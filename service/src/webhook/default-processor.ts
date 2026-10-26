import { createApiRoot } from 'tiktok-shared/dist/commercetools/client';
import { getShopContext } from 'tiktok-shared/dist/services/shop-context.service';
import { clearAuthorization, readState } from 'tiktok-shared/dist/state';
import { getTikTokClient } from 'tiktok-shared/dist/tiktok/client';
import { createWebhookProcessor } from './processor';

/** The processor wired to the real state, commercetools project and TikTok shop. */
export const createDefaultWebhookProcessor = () =>
  createWebhookProcessor({
    getShopId: async () => (await readState())?.tiktokShopId,
    clearAuthorization,
    orderSync: async () => {
      const apiRoot = createApiRoot();
      return {
        apiRoot,
        tiktok: await getTikTokClient(),
        getShopContext: () => getShopContext(apiRoot),
      };
    },
  });
