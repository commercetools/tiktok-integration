import { Router } from 'express';
import { loadMappingConfig, saveMappingConfig } from 'tiktok-shared/dist/mappings';
import { syncShopConfig } from '../authorization/sync-shop-config';
import { buildAuthorizationLink } from '../controllers/authorization-link';
import { getConnectionStatus } from '../controllers/connection-status';
import {
  runFullProductCheck,
  startFullProductSync,
  startSelectiveProductSync,
} from '../controllers/product-sync';
import { asyncHandler } from '../utils/async-handler';

/** `/service/mc/*`: called by the Merchant Center app through forward-to. Mount behind the MC session check. */
export const createMcRouter = (): Router => {
  const router = Router();

  router.get('/authorization-link', (_request, response) => {
    response.json(buildAuthorizationLink());
  });

  router.get(
    '/connection-status',
    asyncHandler(async (_request, response) => {
      response.json(await getConnectionStatus());
    }),
  );

  router.post(
    '/full-product-sync',
    asyncHandler(async (_request, response) => {
      response.status(202).json(await startFullProductSync());
    }),
  );

  router.post(
    '/selective-product-sync',
    asyncHandler(async (request, response) => {
      const body: unknown = request.body;
      const productIds = typeof body === 'object' && body !== null ? (body as { productIds?: unknown }).productIds : undefined;
      response.status(202).json(await startSelectiveProductSync(productIds));
    }),
  );

  router.get(
    '/full-product-check',
    asyncHandler(async (_request, response) => {
      response.json(await runFullProductCheck());
    }),
  );

  router.post(
    '/shop-config-sync',
    asyncHandler(async (_request, response) => {
      const { warehouses } = await syncShopConfig();
      response.json({ message: `Shop configuration synchronized (${warehouses} warehouses)` });
    }),
  );

  router.get(
    '/mappings',
    asyncHandler(async (_request, response) => {
      response.json(await loadMappingConfig());
    }),
  );

  router.put(
    '/mappings',
    asyncHandler(async (request, response) => {
      response.json(await saveMappingConfig(request.body));
    }),
  );

  return router;
};
