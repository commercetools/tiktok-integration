import type { Request, Response } from 'express';
import { createApiRoot } from 'tiktok-shared/dist/src/commercetools/client';
import { logger } from 'tiktok-shared/dist/src/logger';
import { readState } from 'tiktok-shared/dist/src/state';
import { getTikTokClient } from 'tiktok-shared/dist/src/tiktok/client';
import { reconcileOrders } from '../jobs/reconcile-orders';
import { authorizationStatus, refreshTokensIfExpiring } from '../jobs/tokens';

let running = false;

/**
 * Scheduled run: renews the TikTok access token, then reconciles recently updated orders.
 * Does nothing until the shop is authorized. Responds 500 when a step failed so the
 * failure shows up in the job's run history.
 */
export const post = async (_request: Request, response: Response) => {
  if (running) {
    logger.warn('A previous run is still active in this instance; skipping this trigger');
    response.status(200).json({ status: 'skipped', reason: 'already-running' });
    return;
  }
  running = true;
  try {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const status = authorizationStatus(await readState({ fresh: true }), nowSeconds);
    if (status === 'expired') {
      logger.error('The TikTok seller authorization has expired; re-authorize from the Merchant Center');
    } else if (status === 'expiring') {
      logger.warn('The TikTok seller authorization expires soon; re-authorize from the Merchant Center');
    }
    if (status !== 'authorized' && status !== 'expiring') {
      logger.info('The TikTok shop is not authorized; nothing to do', { authorization: status });
      response.status(200).json({ status: 'skipped', authorization: status });
      return;
    }

    let failed = false;
    let tokens: string | undefined;
    try {
      tokens = await refreshTokensIfExpiring(nowSeconds);
      logger.info('TikTok token check finished', { tokens });
    } catch (error) {
      failed = true;
      logger.error('Refreshing the TikTok access token failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    let orders;
    try {
      orders = await reconcileOrders({
        apiRoot: createApiRoot(),
        client: await getTikTokClient(),
      });
      logger.info('TikTok order reconciliation finished', { ...orders });
      failed ||= orders.failed > 0;
      if (orders.truncated) {
        logger.warn('Order reconciliation ran out of time; the next run continues with the rest');
      }
    } catch (error) {
      failed = true;
      logger.error('Reconciling TikTok orders failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    response.status(failed ? 500 : 200).json({ status: failed ? 'failed' : 'ok', authorization: status, tokens, orders });
  } finally {
    running = false;
  }
};
