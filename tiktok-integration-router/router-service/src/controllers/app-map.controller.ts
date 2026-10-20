import { Request, Response } from 'express';
import { getFirestoreClient } from '../utils/firestore.utils';
import {
  Firestore,
  TiktokAuth,
  TiktokShop,
  TiktokWarehouse,
} from '../lib';
import { logger } from '../utils/logger.utils';
import { renderCodeCopyPage } from '../utils/html.utils';
import jwt from 'jsonwebtoken';

/**
 * Stores an app mapping in Firestore
 * @param req - The request object
 * @param res - The response object
 * @returns The response object
 */
export const authorizeApp = async (req: Request, res: Response) => {
  const { app_key, code, locale, shop_region } = req.query;

  if (app_key !== process.env.TIKTOK_APP_KEY) {
    throw new Error('Invalid app key');
  }

  const firestore = getFirestoreClient(req);
  const docId = await Firestore.FirestoreController.MapController.storeMapping(
    firestore,
    app_key as string,
    undefined,
    undefined,
    {
      locale: locale as string,
      shop_region: shop_region as string,
      code: code as string,
    },
  );

  const html = renderCodeCopyPage(docId, 'Shop Authorization Code');
  return res.status(200).type('html').send(html);
};

/**
 * Validate CommerceTools credentials by attempting to get an OAuth token
 * @param clientId - CommerceTools client ID
 * @param clientSecret - CommerceTools client secret
 * @param projectKey - CommerceTools project key
 * @param region - CommerceTools region
 * @returns true if credentials are valid, false otherwise
 */
const validateCommercetoolsCredentials = async (
  clientId: string,
  clientSecret: string,
  projectKey: string,
  region: string,
): Promise<boolean> => {
  try {
    const authUrl = `https://auth.${region}.commercetools.com/oauth/token`;
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=client_credentials&scope=view_project_settings:${projectKey}`,
    });

    return response.ok;
  } catch (error) {
    logger.error('Failed to validate CommerceTools credentials', error);
    return false;
  }
};

/**
 * Generate JWT token for authenticated client
 * @param projectKey - The project key to include in the token
 * @returns JWT token and expiration timestamp
 */
const generateJwtToken = (projectKey: string): { token: string; expiresAt: number } => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable not configured');
  }

  const expiration = process.env.JWT_EXPIRATION || '7d';
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: 'tiktok-integration-router',
    sub: projectKey,
    aud: 'tiktok-integration-router',
    iat: now,
  };

  const token = jwt.sign(payload, secret, { expiresIn: expiration as any });
  const decoded = jwt.decode(token) as { exp: number };
  
  return {
    token,
    expiresAt: decoded.exp,
  };
};

/**
 * Stores a project mapping in Firestore
 * @param req - The request object
 * @param res - The response object
 * @returns The response object
 */
export const authorizeProject = async (req: Request, res: Response) => {
  try {
    const { 
      project_key, 
      service_url, 
      shop_doc_id, 
      shop_id,
      ct_client_id,
      ct_client_secret,
      ct_region,
    } = req.body;


    if (!project_key || !service_url || !shop_doc_id) {
      throw new Error('Project key, service url and docId are required');
    }

    if (!ct_client_id || !ct_client_secret || !ct_region) {
      throw new Error('CommerceTools credentials (ct_client_id, ct_client_secret, ct_region) are required');
    }

    // Validate CommerceTools credentials
    const isValidCredentials = await validateCommercetoolsCredentials(
      ct_client_id,
      ct_client_secret,
      project_key,
      ct_region,
    );

    if (!isValidCredentials) {
      logger.error('Invalid CommerceTools credentials', { project_key });
      throw new Error('Invalid CommerceTools credentials');
    }

    logger.info('CommerceTools credentials validated successfully', { project_key });

    const firestore = getFirestoreClient(req);

    const updateResult =
      await Firestore.FirestoreController.MapController.updateDataByDocId(
        firestore,
        shop_doc_id,
        {
          service_url: service_url,
          project_key: project_key,
          shop_id: shop_id,
        },
      );
    if (!updateResult) {
      throw new Error('Failed to update data by docId');
    }
    const appMapData =
      await Firestore.FirestoreController.MapController.getMappingById(
        firestore,
        shop_doc_id,
      );
    if (!appMapData) {
      throw new Error('Failed to get mapping by docId');
    }

    if (appMapData?.options?.code_consumed) {
      throw new Error('Code already consumed');
    }

    const { data } = await TiktokAuth.getAccessToken(
      appMapData?.options?.code as string,
      process.env.TIKTOK_APP_KEY as string,
      process.env.TIKTOK_APP_SECRET as string,
    ).catch((error) => {
      throw new Error('Cannot authenticate with tiktok: ' + error.message);
    });

    if (!data) {
      throw new Error('Cannot authenticate with tiktok');
    }

    const shops = await TiktokShop.getAuthorizedShops(data.access_token);
    if (!shops) {
      throw new Error('No shops found');
    }
    const shop = shops.find((shop) => shop.id === shop_id);
    if (!shop) {
      throw new Error('Shop not found');
    }

    const warehouses = await TiktokWarehouse.getWarehouseList(
      data.access_token,
      shop.cipher,
    );
    if (!warehouses || warehouses.length === 0) {
      throw new Error('No warehouses found in TikTok');
    }

    await Firestore.FirestoreController.MapController.updateOptionsByDocId(
      firestore,
      shop_doc_id,
      {
        code_consumed: true,
        shop_cipher: shop.cipher,
        warehouses: warehouses
          .map((warehouse) => ({
            id: warehouse.id,
            entityId: warehouse.entityId,
          }))
          .filter((warehouse) => warehouse.id && warehouse.entityId) as {
          id: string;
          entityId: string;
        }[],
      },
    );

    const updatedAppMapData =
      await Firestore.FirestoreController.MapController.getMappingById(
        firestore,
        shop_doc_id,
      );

    // Generate JWT token for this client
    const jwtData = generateJwtToken(project_key);
    logger.info('JWT token generated successfully', { 
      project_key, 
      expiresAt: new Date(jwtData.expiresAt * 1000).toISOString() 
    });

    return res.status(200).send({
      access_token_data: data,
      app_map_data: updatedAppMapData,
      jwt_token: jwtData.token,
      jwt_expires_at: jwtData.expiresAt,
    });
  } catch (error) {
    logger.error('Error authorizing project', error);
    return res.status(500).send((error as Error).message);
  }
};
/**
 * Sets seller data for a project mapping in Firestore
 * @param req - The request object
 * @param res - The response object
 * @returns The response object
 */
export const setSellerData = async (req: Request, res: Response) => {
  try {
    const { seller_name, seller_id, docId } = req.body;

    if (!seller_name || !seller_id || !docId) {
      throw new Error('Seller name, seller id and docId are required');
    }

    const firestore = getFirestoreClient(req);

    const updateResult =
      await Firestore.FirestoreController.MapController.updateOptionsByDocId(
        firestore,
        docId,
        {
          seller_name: seller_name,
          seller_id: seller_id,
        },
      );
    if (!updateResult) {
      throw new Error('Failed to update data by docId');
    }
    return res.status(200).send(updateResult);
  } catch (error) {
    logger.error('Error authorizing project', error);
    return res.status(500).send((error as Error).message);
  }
};

/**
 * Refresh JWT token using existing JWT
 * Validates the old token's signature (even if expired) and issues a new one
 * @param req - The request object
 * @param res - The response object
 * @returns The response object with new JWT token
 */
export const refreshJwt = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid Authorization header');
    }

    const oldToken = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    // Verify token signature and extract project_key
    // We use ignoreExpiration to allow refreshing expired tokens
    let projectKey: string;
    try {
      const decoded = jwt.verify(oldToken, secret, {
        ignoreExpiration: true, // Allow expired tokens for refresh
      }) as {
        iss: string;
        sub: string;
        aud: string;
      };

      // Validate claims
      if (decoded.iss !== 'tiktok-integration-router' || 
          decoded.aud !== 'tiktok-integration-router') {
        throw new Error('Invalid token claims');
      }

      projectKey = decoded.sub;
    } catch (error) {
      logger.error('Invalid JWT token for refresh', error);
      throw new Error('Invalid token signature or format');
    }

    // Generate new JWT token
    const jwtData = generateJwtToken(projectKey);
    
    logger.info('JWT token refreshed successfully', {
      project_key: projectKey,
      expiresAt: new Date(jwtData.expiresAt * 1000).toISOString(),
    });

    return res.status(200).json({
      jwt_token: jwtData.token,
      jwt_expires_at: jwtData.expiresAt,
    });
  } catch (error) {
    logger.error('Error refreshing JWT token', error);
    return res.status(401).send((error as Error).message);
  }
};
