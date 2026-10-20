import { Request, Response } from 'express';
import { logger } from '../utils/logger.utils';
import {
  orderStatusChange,
  reverseStatusUpdate,
} from './tiktok.order.controller';

export type TiktokWebhookOrderStatusChangeMessageType = {
  type: number;
  notificationType: string;
  tts_notification_id: string;
  shop_id: string;
  timestamp: number;
  data: {
    is_on_hold_order?: boolean;
    order_id: string;
    order_status: string;
    update_time: number;
  };
};

export const handleTiktokWebhook = async (
  request: Request,
  response: Response
) => {
  const message = request.body as TiktokWebhookOrderStatusChangeMessageType;
  if (message.shop_id !== process.env.TIKTOK_SHOP_ID) {
    throw new Error('Invalid shop ID');
  }
  response.status(200).send('Webhook received');
  try {
    switch (message.type) {
      case 1:
        await orderStatusChange(message);
        break;
      case 2:
        await reverseStatusUpdate(message);
        break;
    }
  } catch (error) {
    logger.error('Error processing webhook', error);
  }
};
