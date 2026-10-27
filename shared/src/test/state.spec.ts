import { randomBytes } from 'node:crypto';
import { decrypt, encrypt } from '../crypto';
import { NotAuthorizedError, StoreNotFoundError } from '../errors';

const key = randomBytes(32);

jest.mock('../config', () => ({
  readConfiguration: () => ({ encryptionKey: key }),
}));
jest.mock('../logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../tiktok/auth', () => ({ refreshAccessToken: jest.fn() }));

type Fields = Record<string, unknown>;
const fake = {
  fields: {} as Fields,
  version: 1,
  exists: true,
  conflicts: 0,
  posts: [] as Array<{ version: number; actions: Array<{ name: string; value?: unknown }> }>,
};

jest.mock('../commercetools/client', () => ({
  createApiRoot: () => ({
    stores: () => ({
      get: () => ({
        execute: async () => ({
          body: {
            results: fake.exists
              ? [{ id: 'store-1', version: fake.version, custom: { fields: fake.fields } }]
              : [],
          },
        }),
      }),
      withId: () => ({
        post: ({ body }: { body: (typeof fake.posts)[number] }) => ({
          execute: async () => {
            if (fake.conflicts > 0) {
              fake.conflicts -= 1;
              fake.version += 1;
              throw Object.assign(new Error('conflict'), { statusCode: 409 });
            }
            fake.posts.push(body);
            for (const action of body.actions) {
              if (action.value === undefined) {
                if (!(action.name in fake.fields)) {
                  throw new Error(
                    `Cannot remove custom field '${action.name}' because it does not exist.`,
                  );
                }
                delete fake.fields[action.name];
              } else fake.fields[action.name] = action.value;
            }
            fake.version += 1;
            return { body: {} };
          },
        }),
      }),
    }),
  }),
}));

import { refreshAccessToken } from '../tiktok/auth';
import {
  clearAuthorization,
  getValidAccessToken,
  isAuthorized,
  readState,
  saveTokens,
  writeState,
} from '../state';

const refreshMock = refreshAccessToken as jest.MockedFunction<typeof refreshAccessToken>;
const now = () => Math.floor(Date.now() / 1000);

const authorizedFields = (accessExpiresIn: number): Fields => ({
  isTikTokShop: true,
  tiktokShopCipher: 'cipher',
  tiktokAccessToken: encrypt('access-1', key),
  tiktokRefreshToken: encrypt('refresh-1', key),
  tiktokAccessExpiresAt: now() + accessExpiresIn,
  tiktokRefreshExpiresAt: now() + 86_400,
  tiktokAuthorizedAt: now() - 10,
});

beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask'] });
});
afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  // Moves past readState's short-lived cache so each test starts from a fresh read.
  jest.setSystemTime(Date.now() + 10_000);
  fake.fields = {};
  fake.version = 1;
  fake.exists = true;
  fake.conflicts = 0;
  fake.posts = [];
  refreshMock.mockReset();
});

describe('state', () => {
  it('reads plaintext and decrypts tokens', async () => {
    fake.fields = authorizedFields(3600);
    expect(await readState({ fresh: true })).toMatchObject({
      tiktokShopCipher: 'cipher',
      tiktokAccessToken: 'access-1',
      tiktokRefreshToken: 'refresh-1',
    });
  });

  it('returns undefined without a flagged store', async () => {
    fake.exists = false;
    expect(await readState({ fresh: true })).toBeUndefined();
  });

  it('drops tokens it cannot decrypt instead of throwing', async () => {
    fake.fields = { ...authorizedFields(3600), tiktokAccessToken: encrypt('x', randomBytes(32)) };
    const state = await readState({ fresh: true });
    expect(state?.tiktokAccessToken).toBeUndefined();
    expect(state?.tiktokRefreshToken).toBe('refresh-1');
  });

  it('encrypts tokens, leaves other fields plain and clears null fields', async () => {
    fake.fields = { tiktokShopName: 'old' };
    await writeState({ tiktokAccessToken: 'tok', tiktokRegion: 'US', tiktokShopName: null });
    expect(fake.fields.tiktokRegion).toBe('US');
    expect(fake.fields.tiktokShopName).toBeUndefined();
    expect(fake.fields.tiktokAccessToken).not.toBe('tok');
    expect(decrypt(fake.fields.tiktokAccessToken as string, key)).toBe('tok');
  });

  it('retries a 409 with a fresh version and succeeds', async () => {
    fake.conflicts = 2;
    await writeState({ tiktokRegion: 'GB' });
    expect(fake.fields.tiktokRegion).toBe('GB');
    expect(fake.posts).toHaveLength(1);
    expect(fake.posts[0]?.version).toBe(3);
  });

  it('gives up after repeated conflicts', async () => {
    fake.conflicts = 99;
    await expect(writeState({ tiktokRegion: 'GB' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('throws StoreNotFoundError when writing without a store', async () => {
    fake.exists = false;
    await expect(writeState({ tiktokRegion: 'GB' })).rejects.toBeInstanceOf(StoreNotFoundError);
  });

  it('skips clearing fields the store does not have and still writes the rest', async () => {
    fake.fields = { isTikTokShop: true };
    await writeState({ tiktokRegion: 'US', tiktokShopName: null, tiktokDeauthorizedAt: null });
    expect(fake.fields.tiktokRegion).toBe('US');
    expect(fake.posts).toHaveLength(1);
    expect(fake.posts[0]?.actions.map((action) => action.name)).toEqual(['tiktokRegion']);
  });

  it('does not call the API when every field to clear is already absent', async () => {
    fake.fields = { isTikTokShop: true };
    await writeState({ tiktokShopName: null, tiktokShopCode: null });
    expect(fake.posts).toHaveLength(0);
  });

  it('still clears the fields that exist', async () => {
    fake.fields = { isTikTokShop: true, tiktokShopName: 'Shop' };
    await writeState({ tiktokShopName: null, tiktokShopCode: null });
    expect(fake.posts[0]?.actions.map((action) => action.name)).toEqual(['tiktokShopName']);
    expect(fake.fields.tiktokShopName).toBeUndefined();
  });

  it('can deauthorize twice, as TikTok may send the webhook again', async () => {
    fake.fields = authorizedFields(3600);
    await clearAuthorization();
    await clearAuthorization();
    expect(await isAuthorized()).toBe(false);
  });

  it('does not call the API for an empty patch', async () => {
    await writeState({});
    expect(fake.posts).toHaveLength(0);
  });

  it('tracks authorization through saveTokens and clearAuthorization', async () => {
    fake.fields = { isTikTokShop: true };
    expect(await isAuthorized()).toBe(false);
    await saveTokens(
      { accessToken: 'a', refreshToken: 'r', accessTokenExpiresAt: now() + 3600, refreshTokenExpiresAt: now() + 7200 },
      { authorized: true },
    );
    expect(await isAuthorized()).toBe(true);
    await clearAuthorization();
    expect(await isAuthorized()).toBe(false);
    expect(fake.fields.tiktokAccessToken).toBeUndefined();
    expect(fake.fields.tiktokDeauthorizedAt).toEqual(expect.any(Number));
  });
});

describe('getValidAccessToken', () => {
  it('returns the stored token without refreshing while it is valid', async () => {
    fake.fields = authorizedFields(3600);
    await writeState({});
    expect(await getValidAccessToken()).toBe('access-1');
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('refreshes lazily when expiring within five minutes and persists the new pair once', async () => {
    fake.fields = authorizedFields(120);
    refreshMock.mockResolvedValue({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
      accessTokenExpiresAt: now() + 7 * 86_400,
      refreshTokenExpiresAt: now() + 30 * 86_400,
    });
    const [a, b] = await Promise.all([getValidAccessToken(), getValidAccessToken()]);
    expect([a, b]).toEqual(['access-2', 'access-2']);
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(refreshMock).toHaveBeenCalledWith('refresh-1');
    expect(decrypt(fake.fields.tiktokRefreshToken as string, key)).toBe('refresh-2');
  });

  it('uses tokens another instance refreshed when our refresh fails', async () => {
    fake.fields = authorizedFields(120);
    refreshMock.mockImplementation(async () => {
      fake.fields = { ...authorizedFields(7 * 86_400), tiktokAccessToken: encrypt('access-3', key) };
      throw new Error('refresh token already used');
    });
    expect(await getValidAccessToken()).toBe('access-3');
  });

  it('rethrows when the refresh fails and nothing fresher exists', async () => {
    fake.fields = authorizedFields(120);
    refreshMock.mockRejectedValue(new Error('boom'));
    await expect(getValidAccessToken()).rejects.toThrow('boom');
  });

  it('throws NotAuthorizedError when no tokens exist or the shop was deauthorized', async () => {
    fake.fields = { isTikTokShop: true };
    await expect(getValidAccessToken()).rejects.toBeInstanceOf(NotAuthorizedError);
    fake.fields = { ...authorizedFields(120), tiktokDeauthorizedAt: now() };
    await expect(getValidAccessToken()).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
