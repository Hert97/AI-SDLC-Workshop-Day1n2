import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { createSession, deleteSession, getSession } from '@/lib/auth';

describe('auth utilities', () => {
  const mockedCookies = vi.mocked(cookies);
  const cookieStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-super-secret-key';
    process.env.NODE_ENV = 'test';
    mockedCookies.mockResolvedValue(cookieStore as never);
    cookieStore.get.mockReset();
    cookieStore.set.mockReset();
    cookieStore.delete.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
  });

  it('creates a signed session cookie', async () => {
    await createSession({ userId: 42, username: 'alice' });

    expect(cookieStore.set).toHaveBeenCalledTimes(1);
    const [name, token, options] = cookieStore.set.mock.calls[0];
    expect(name).toBe('session');
    expect(typeof token).toBe('string');
    expect((token as string).length).toBeGreaterThan(10);
    expect(options).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
  });

  it('returns null when session cookie is missing', async () => {
    cookieStore.get.mockReturnValue(undefined);
    await expect(getSession()).resolves.toBeNull();
  });

  it('returns null when session token is invalid', async () => {
    cookieStore.get.mockReturnValue({ value: 'not-a-jwt' });
    await expect(getSession()).resolves.toBeNull();
  });

  it('returns parsed session when cookie has a valid token', async () => {
    await createSession({ userId: 7, username: 'bob' });
    const [, token] = cookieStore.set.mock.calls[0];
    cookieStore.get.mockReturnValue({ value: token });

    await expect(getSession()).resolves.toEqual({
      userId: 7,
      username: 'bob',
    });
  });

  it('deletes session cookie', async () => {
    await deleteSession();
    expect(cookieStore.delete).toHaveBeenCalledWith('session');
  });

  it('throws when JWT_SECRET is missing during session creation', async () => {
    delete process.env.JWT_SECRET;
    await expect(createSession({ userId: 1, username: 'x' })).rejects.toThrow(
      'JWT_SECRET environment variable is not set',
    );
  });
});
