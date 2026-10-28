import { Router, type Request } from 'express';
import {
  assertCategoryId,
  getCategoryAttributes,
  getCategoryRules,
  listCategories,
} from '../controllers/tiktok-metadata';
import { asyncHandler } from '../utils/async-handler';

const queryString = (request: Request, name: string): string | undefined => {
  const value = request.query[name];
  return typeof value === 'string' && value !== '' ? value : undefined;
};

/** `/service/tiktok/*`: read-only TikTok metadata for the mapping UI. Mount behind the MC session check. */
export const createTiktokRouter = (): Router => {
  const router = Router();

  router.get(
    '/categories',
    asyncHandler(async (request, response) => {
      response.json(
        await listCategories({
          locale: queryString(request, 'locale'),
          keyword: queryString(request, 'keyword'),
          listingPlatform: queryString(request, 'listing_platform'),
          includeProhibitedCategories: queryString(request, 'include_prohibited_categories') === 'true',
        }),
      );
    }),
  );

  router.get(
    '/categories/:categoryId/rules',
    asyncHandler(async (request, response) => {
      response.json(await getCategoryRules(assertCategoryId(request.params.categoryId)));
    }),
  );

  router.get(
    '/categories/:categoryId/attributes',
    asyncHandler(async (request, response) => {
      response.json(await getCategoryAttributes(assertCategoryId(request.params.categoryId)));
    }),
  );

  router.get(
    '/attributes',
    asyncHandler(async (request, response) => {
      response.json(await getCategoryAttributes(assertCategoryId(request.query.category_id)));
    }),
  );

  return router;
};
