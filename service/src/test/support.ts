/** Environment of a fully configured service, for tests. CLOUD_IDENTIFIER is overridden per test. */
export const TEST_ENV: Record<string, string> = {
  CTP_REGION: 'europe-west1.gcp',
  CTP_PROJECT_KEY: 'proj-x',
  CTP_CLIENT_ID: 'client-id',
  CTP_CLIENT_SECRET: 'client-secret',
  CTP_SCOPE: 'manage_stores:proj-x manage_orders:proj-x',
  CLOUD_IDENTIFIER: 'gcp-eu',
  TIKTOK_APP_KEY: 'abcdef',
  TIKTOK_APP_SECRET: '123',
  ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
  CONNECT_SERVICE_URL: 'https://svc.example/service',
};

export const applyTestEnv = (overrides: Record<string, string> = {}): void => {
  Object.assign(process.env, TEST_ENV, overrides);
};
