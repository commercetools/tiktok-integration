import express, { Router } from 'express';
import { readConfiguration } from 'tiktok-shared/dist/config';
import { logger } from 'tiktok-shared/dist/logger';
import { verifyWebhookSignature } from 'tiktok-shared/dist/tiktok/webhook-signature';
import { envelopeSchema } from '../webhook/envelope';
import type { WebhookProcessor } from '../webhook/processor';

/**
 * `POST /service/webhook`: the URL TikTok calls. The body is read as raw bytes because the
 * signature covers them exactly. A verified request is acknowledged at once and handled
 * afterwards, since TikTok wants a fast 2xx; handlers are idempotent and failures are logged.
 */
export const createWebhookRouter = (handle: WebhookProcessor): Router => {
  const router = Router();

  router.post('/', express.raw({ type: () => true, limit: '1mb' }), (request, response) => {
    const rawBody = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
    const { appKey, appSecret } = readConfiguration().tiktok;
    const verified = verifyWebhookSignature({
      appKey,
      appSecret,
      rawBody,
      authorization: request.header('authorization'),
    });
    if (!verified) {
      logger.warn('Webhook refused: signature missing or invalid');
      response.status(401).json({ message: 'Unauthorized' });
      return;
    }

    let envelope;
    try {
      envelope = envelopeSchema.parse(JSON.parse(rawBody.toString('utf8')));
    } catch {
      logger.warn('Webhook refused: the body is not a webhook envelope');
      response.status(400).json({ message: 'Invalid webhook body' });
      return;
    }

    response.status(200).json({ message: 'Webhook received' });
    handle(envelope).catch((error: unknown) => {
      logger.error('Processing the webhook failed', {
        notificationId: envelope.tts_notification_id,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  });

  return router;
};
