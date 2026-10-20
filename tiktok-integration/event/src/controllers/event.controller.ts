import { Request, Response } from 'express';
import CustomError from '../errors/custom.error';
import { logger } from '../utils/logger.utils';
import { resourceMessage } from './message.controller';

/**
 * Exposed event POST endpoint.
 * Receives the Pub/Sub message and works with it
 *
 * @param {Request} request The express request
 * @param {Response} response The express response
 * @returns
 */
export const post = async (request: Request, response: Response) => {
  // Check request body
  if (!request.body) {
    logger.error('Missing request body.');
    throw new CustomError(400, 'Bad request: No Pub/Sub message was received');
  }

  // Check if the body comes in a message
  if (!request.body.message) {
    logger.error('Missing body message');
    throw new CustomError(400, 'Bad request: Wrong No Pub/Sub message format');
  }

  // Receive the Pub/Sub message
  const pubSubMessage = request.body.message;

  // For our example we will use the customer id as a var
  // and the query the commercetools sdk with that info
  const decodedData = pubSubMessage.data
    ? Buffer.from(pubSubMessage.data, 'base64').toString().trim()
    : undefined;

  try {
    if (decodedData) {
      const jsonData = JSON.parse(decodedData);
      //CoCo sending message to indicate the resource was created, does not need processing
      logger.info(
        'Event message received ' +
          jsonData.notificationType +
          ' for resource ' +
          jsonData.resource?.typeId +
          ' with type ' +
          jsonData.type
      );
      switch (jsonData.notificationType) {
        case 'Message':
          await resourceMessage(jsonData);
          break;
      }
    }
  } catch (error) {
    if (error instanceof CustomError && error.retryable) {
      response.status(500).send();
    } else {
      response.status(202).send();
    }
  }

  // Return the response for the client
  response.status(202).send();
};
