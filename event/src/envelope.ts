import { z } from 'zod';

export class BadEnvelopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadEnvelopeError';
  }
}

const pushEnvelopeSchema = z.object({
  message: z.object({ data: z.string().min(1) }),
});

const subscriptionMessageSchema = z.looseObject({
  notificationType: z.string(),
  resource: z.looseObject({ typeId: z.string(), id: z.string() }),
  type: z.string().optional(),
});

export type SubscriptionMessage = z.infer<typeof subscriptionMessageSchema>;

/**
 * Connect pushes the subscription notification as `{ message: { data: <base64 JSON> } }`.
 * Each layer is validated; a failure throws `BadEnvelopeError`.
 */
export const decodeEnvelope = (body: unknown): SubscriptionMessage => {
  const envelope = pushEnvelopeSchema.safeParse(body);
  if (!envelope.success) {
    throw new BadEnvelopeError('missing Pub/Sub message data');
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(
      Buffer.from(envelope.data.message.data, 'base64').toString().trim(),
    );
  } catch {
    throw new BadEnvelopeError('message data is not base64 encoded JSON');
  }

  const message = subscriptionMessageSchema.safeParse(decoded);
  if (!message.success) {
    throw new BadEnvelopeError(
      'message data has no notificationType or resource reference',
    );
  }
  return message.data;
};
