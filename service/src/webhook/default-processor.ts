import { createApiRoot } from '../../../shared/commercetools/client';
import { getShopContext } from '../../../shared/services/shop-context.service';
import { clearAuthorization, readState } from '../../../shared/state';
import { getTikTokClient } from '../../../shared/tiktok/client';
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
