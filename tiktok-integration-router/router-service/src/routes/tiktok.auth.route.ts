import { Router } from 'express';
import { logger } from '../utils/logger.utils';
import { TiktokAuth } from '../lib';

const tiktokAuthRouter = Router();

/**
 * Gets called by the TikTok app to authorize the app
 */
tiktokAuthRouter.get('/refresh-access-token', async (req, res, next) => {
  const { refresh_token } = req.query;
  if (!refresh_token) {
    return res.status(400).send('Refresh token is required');
  }
  await TiktokAuth.refreshAccessToken(
    refresh_token as string,
    process.env.TIKTOK_APP_KEY as string,
    process.env.TIKTOK_APP_SECRET as string,
  )
  .then((data) => {
    return res.status(200).send(data);
  })
  .catch((error) => {
    logger.error('Error authorizing app', error);
    return res.status(500).send(error.message);
  });
});

export default tiktokAuthRouter;