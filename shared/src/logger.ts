import {
  createApplicationLogger,
  redactFieldsFormatter,
} from '@commercetools-backend/loggers';

const SENSITIVE_FIELDS = [
  'accessToken',
  'refreshToken',
  'access_token',
  'refresh_token',
  'tiktokAccessToken',
  'tiktokRefreshToken',
  'appSecret',
  'app_secret',
  'clientSecret',
  'authorization',
  'x-tts-access-token',
  'encryptionKey',
];

export const logger = createApplicationLogger({
  formatters: [redactFieldsFormatter({ fields: SENSITIVE_FIELDS })],
});
