import { readState, saveTokens } from 'tiktok-shared/dist/state';
import { refreshAccessToken } from 'tiktok-shared/dist/tiktok/auth';
import {
  authorizationStatus,
  refreshTokensIfExpiring,
  REAUTHORIZATION_WARNING_SECONDS,
  REFRESH_WINDOW_SECONDS,
} from './tokens';

jest.mock('tiktok-shared/dist/state', () => ({ readState: jest.fn(), saveTokens: jest.fn() }));
jest.mock('tiktok-shared/dist/tiktok/auth', () => ({ refreshAccessToken: jest.fn() }));
jest.mock('tiktok-shared/dist/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const NOW = 1_800_000_000;
const DAY = 86_400;

const state = (patch: Record<string, unknown> = {}) => ({
  tiktokAccessToken: 'access',
  tiktokRefreshToken: 'refresh',
  tiktokAccessExpiresAt: NOW + 3 * DAY,
  tiktokRefreshExpiresAt: NOW + 300 * DAY,
  tiktokAuthorizedAt: NOW - DAY,
  ...patch,
});

describe('authorizationStatus', () => {
  it.each([
    ['no state', undefined, 'not-authorized'],
    ['no tokens and never deauthorized', {}, 'not-authorized'],
    ['no tokens after deauthorization', { tiktokDeauthorizedAt: NOW - 5 }, 'deauthorized'],
    ['deauthorized after the last authorization', state({ tiktokDeauthorizedAt: NOW }), 'deauthorized'],
    ['reauthorized after a deauthorization', state({ tiktokDeauthorizedAt: NOW - 2 * DAY }), 'authorized'],
    ['an expired refresh token', state({ tiktokRefreshExpiresAt: NOW - 1 }), 'expired'],
    [
      'a refresh token expiring inside the warning window',
      state({ tiktokRefreshExpiresAt: NOW + REAUTHORIZATION_WARNING_SECONDS - 1 }),
      'expiring',
    ],
    ['a healthy authorization', state(), 'authorized'],
    ['an unknown refresh expiry', state({ tiktokRefreshExpiresAt: undefined }), 'authorized'],
  ])('reports %s', (_name, input, expected) => {
    expect(authorizationStatus(input, NOW)).toBe(expected);
  });
});

describe('refreshTokensIfExpiring', () => {
  const tokens = { accessToken: 'new', refreshToken: 'new-refresh' };

  beforeEach(() => {
    jest.mocked(refreshAccessToken).mockResolvedValue(tokens as never);
  });

  it('refreshes when the access token expires within 24 hours', async () => {
    jest.mocked(readState).mockResolvedValue(state({ tiktokAccessExpiresAt: NOW + REFRESH_WINDOW_SECONDS - 1 }));
    await expect(refreshTokensIfExpiring(NOW)).resolves.toBe('refreshed');
    expect(refreshAccessToken).toHaveBeenCalledWith('refresh');
    expect(saveTokens).toHaveBeenCalledWith(tokens);
  });

  it('leaves a token that is valid for more than 24 hours alone', async () => {
    jest.mocked(readState).mockResolvedValue(state());
    await expect(refreshTokensIfExpiring(NOW)).resolves.toBe('still-valid');
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('skips without a refresh token or with an expired authorization', async () => {
    jest.mocked(readState).mockResolvedValue({});
    await expect(refreshTokensIfExpiring(NOW)).resolves.toBe('skipped');
    jest.mocked(readState).mockResolvedValue(state({ tiktokRefreshExpiresAt: NOW - 1 }));
    await expect(refreshTokensIfExpiring(NOW)).resolves.toBe('skipped');
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('accepts a token another instance refreshed first', async () => {
    jest
      .mocked(readState)
      .mockResolvedValueOnce(state({ tiktokAccessExpiresAt: NOW + 60 }))
      .mockResolvedValueOnce(state());
    jest.mocked(refreshAccessToken).mockRejectedValue(new Error('refresh token already used'));
    await expect(refreshTokensIfExpiring(NOW)).resolves.toBe('still-valid');
    expect(saveTokens).not.toHaveBeenCalled();
  });

  it('rethrows when the refresh fails and nothing fresher is stored', async () => {
    jest.mocked(readState).mockResolvedValue(state({ tiktokAccessExpiresAt: NOW + 60 }));
    jest.mocked(refreshAccessToken).mockRejectedValue(new Error('TikTok down'));
    await expect(refreshTokensIfExpiring(NOW)).rejects.toThrow('TikTok down');
  });
});
