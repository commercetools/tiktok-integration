import { randomBytes } from 'node:crypto';
import { readConfiguration } from '../config';
import { ConfigurationError } from '../errors';

const base = {
  CTP_REGION: 'europe-west1.gcp',
  CTP_PROJECT_KEY: 'proj',
  CTP_CLIENT_ID: 'id',
  CTP_CLIENT_SECRET: 'client-secret',
  CTP_SCOPE: 'manage_stores:proj view_products:proj',
  CLOUD_IDENTIFIER: 'gcp-eu',
  TIKTOK_APP_KEY: 'app-key',
  TIKTOK_APP_SECRET: 'app-secret',
  ENCRYPTION_KEY: randomBytes(32).toString('base64'),
};

describe('readConfiguration', () => {
  it('parses a complete environment', () => {
    const config = readConfiguration({ ...base, CONNECT_SERVICE_URL: 'https://svc.example/service' });
    expect(config.ctp.scopes).toEqual(['manage_stores:proj', 'view_products:proj']);
    expect(config.encryptionKey).toHaveLength(32);
    expect(config.connectServiceUrl?.origin).toBe('https://svc.example');
    expect(config.tiktok.authorizationLink).toBeUndefined();
  });

  it('accepts an issuer URL as CLOUD_IDENTIFIER (tests)', () => {
    expect(readConfiguration({ ...base, CLOUD_IDENTIFIER: 'http://127.0.0.1:1234' }).cloudIdentifier).toBe('http://127.0.0.1:1234');
  });

  it('names every problem and never leaks values', () => {
    const attempt = () =>
      readConfiguration({ ...base, TIKTOK_APP_KEY: '', CLOUD_IDENTIFIER: 'mars', ENCRYPTION_KEY: 'c2hvcnQ=' });
    expect(attempt).toThrow(ConfigurationError);
    try {
      attempt();
    } catch (error) {
      const { message } = error as ConfigurationError;
      expect(message).toContain('TIKTOK_APP_KEY is required');
      expect(message).toContain('CLOUD_IDENTIFIER');
      expect(message).toContain('ENCRYPTION_KEY must be 32 bytes');
      expect(message).not.toContain('c2hvcnQ=');
    }
  });
});
