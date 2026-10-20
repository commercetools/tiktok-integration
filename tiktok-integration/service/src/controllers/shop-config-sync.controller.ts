import { Request, Response } from 'express';
import { CommercetoolsClient, CommercetoolsStorage, Utils } from '../shared';
import CustomError from '../errors/custom.error';

export const shopConfigSync = async (req: Request, res: Response) => {
  try {
    const apiRoot = CommercetoolsClient.createApiRoot(
      Utils.readConfiguration(),
    );
    const access_token =
      await CommercetoolsStorage.TokenController.getAccessToken(apiRoot);
    if (!access_token) {
      throw new Error('No access token found');
    }
    // await Services.initializeShop(
    //   apiRoot,
    //   access_token,
    //   process.env.TIKTOK_SHOP_ID as string,
    // );

    res.status(200).send();
  } catch (error) {
    throw new CustomError(
      500,
      `Internal Server Error - Error initializing shop`,
    );
  }
};
