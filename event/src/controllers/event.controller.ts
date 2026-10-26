import type { Request, Response } from 'express';
import { logger } from 'tiktok-shared/dist/logger';
import { isAuthorized } from 'tiktok-shared/dist/state';
import { BadEnvelopeError, decodeEnvelope } from '../envelope';
import { handleMessage } from '../handlers';
import { isTransientError } from '../transient';

/**
 * Receives a Connect subscription push. Acknowledges (2xx) everything that is handled,
 * irrelevant or can never succeed; answers 503 only for transient failures so the broker
 * redelivers them.
 */
export const post = async (request: Request, response: Response) => {
  let message;
  try {
    message = decodeEnvelope(request.body);
  } catch (error) {
    if (error instanceof BadEnvelopeError) {
      logger.warn(`Dropping malformed event envelope: ${error.message}`);
      response.status(200).send();
      return;
    }
    throw error;
  }

  const { notificationType, resource, type } = message;
  logger.info(
    `Event received: ${notificationType} ${type ?? ''} for ${resource.typeId} ${resource.id}`,
  );
  if (notificationType !== 'Message') {
    response.status(200).send();
    return;
  }

  try {
    if (!(await isAuthorized())) {
      logger.info('The TikTok shop is not authorized yet; skipping the event');
      response.status(200).send();
      return;
    }
    await handleMessage(message);
    response.status(204).send();
  } catch (error) {
    if (isTransientError(error)) {
      logger.warn('Transient failure while handling the event; requesting redelivery', { error });
      response.status(503).send();
      return;
    }
    logger.error('Event cannot be processed and is acknowledged', { error });
    response.status(200).send();
  }
};
