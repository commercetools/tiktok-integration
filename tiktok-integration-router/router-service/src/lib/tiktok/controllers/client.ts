import { TikTokShopNodeApiClient } from '../../tiktok-sdk';

const createTiktokClient = (app_key: string, app_secret: string) => {
  return new TikTokShopNodeApiClient({
    config: {
      app_key: app_key,
      app_secret: app_secret,
    },
  });
};

const client = createTiktokClient(
  process.env.TIKTOK_APP_KEY as string,
  process.env.TIKTOK_APP_SECRET as string,
);

export { client };
