import { createSign, generateKeyPairSync, type KeyObject } from 'node:crypto';
import { createServer, type Server } from 'node:http';

/**
 * A local Merchant Center issuer: an RSA key and its JWKS over plain http. The session verifier
 * accepts any issuer URL, so CLOUD_IDENTIFIER is set to this server's origin in tests.
 */
export interface LocalIssuer {
  issuer: string;
  /** A signed exchange token plus the headers /proxy/forward-to adds. */
  headers(options: {
    aud: string;
    projectKey?: string;
    key?: KeyObject;
    expSeconds?: number;
    iss?: string;
  }): Record<string, string>;
  /** A token with `alg: none` and no signature. */
  unsignedHeaders(aud: string): Record<string, string>;
  close(): Promise<void>;
}

const encode = (value: unknown): string =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

export const startIssuer = async (): Promise<LocalIssuer> => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
  const server: Server = createServer((request, response) => {
    if (request.url === '/.well-known/jwks.json') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ keys: [jwk] }));
    } else {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  const issuer = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;

  const claims = (aud: string, projectKey: string, expSeconds: number, iss: string) => {
    const now = Math.floor(Date.now() / 1000);
    return {
      iss,
      sub: 'user-1',
      aud,
      iat: now,
      exp: now + expSeconds,
      type: 'exchange',
      [`${issuer}/claims/project_key`]: projectKey,
    };
  };
  const forwardHeaders = (token: string): Record<string, string> => ({
    authorization: `Bearer ${token}`,
    'x-mc-api-cloud-identifier': 'local',
    'x-mc-api-forward-to-version': 'v2',
  });

  return {
    issuer,
    headers({ aud, projectKey = 'proj-x', key = privateKey, expSeconds = 60, iss = issuer }) {
      const head = `${encode({ alg: 'RS256', typ: 'JWT', kid: 'k1' })}.${encode(claims(aud, projectKey, expSeconds, iss))}`;
      const signature = createSign('RSA-SHA256').update(head).sign(key).toString('base64url');
      return forwardHeaders(`${head}.${signature}`);
    },
    unsignedHeaders(aud) {
      const head = `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims(aud, 'proj-x', 60, issuer))}`;
      return forwardHeaders(`${head}.`);
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
