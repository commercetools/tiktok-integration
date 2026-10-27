import { randomBytes } from 'node:crypto';
import { issueAuthState, verifyAuthState } from '../auth/state';

const key = randomBytes(32);
const now = 1_700_000_000;

describe('auth state', () => {
  it('verifies a fresh value', () => {
    expect(verifyAuthState(issueAuthState({ key, now }), { key, now: now + 5 })).toBe(true);
  });

  it('issues a different value each time', () => {
    expect(issueAuthState({ key, now })).not.toBe(issueAuthState({ key, now }));
  });

  it('rejects an expired value', () => {
    const value = issueAuthState({ key, now, ttlSeconds: 60 });
    expect(verifyAuthState(value, { key, now: now + 61 })).toBe(false);
  });

  it('rejects a wrong key and a tampered expiry', () => {
    const value = issueAuthState({ key, now, ttlSeconds: 60 });
    expect(verifyAuthState(value, { key: randomBytes(32), now })).toBe(false);
    const [nonce, , signature] = value.split('.') as [string, string, string];
    expect(verifyAuthState(`${nonce}.${now + 99999}.${signature}`, { key, now })).toBe(false);
  });

  it('rejects malformed input', () => {
    for (const value of [undefined, '', 'a.b', 'a.b.c.d', '..']) {
      expect(verifyAuthState(value, { key, now })).toBe(false);
    }
  });
});
