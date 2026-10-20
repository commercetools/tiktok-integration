import { Router } from 'express';

const genericRouter = Router();

/**
 * Health check endpoint
 */
genericRouter.get('/health', async (req, res, next) => {
  return res.status(200).send('OK');
});

/**
 * Gets tiktok app authorization link
 */
genericRouter.get('/authorization-link', async (req, res, next) => {
  return res.status(200).send(process.env.TIKTOK_APP_AUTHORIZATION_LINK);
});

export default genericRouter;
