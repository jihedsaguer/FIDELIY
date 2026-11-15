import { Request } from 'express';
import { SessionService } from '../../src/features/auth/session.service';

describe('SessionService', () => {
  const service = new SessionService();

  it('preserves the complete Cookie header for Better Auth validation', () => {
    const cookieHeader =
      'better-auth.session_token=signed-value; better-auth.session_data=cache-value; other=value';
    const request = {
      headers: { cookie: cookieHeader },
    } as Request;

    expect(service.extractCookieHeader(request)).toBe(cookieHeader);
  });

  it('does not treat a bearer token as a signed Better Auth cookie', () => {
    const request = {
      headers: { authorization: 'Bearer opaque-token' },
    } as Request;

    expect(service.extractCookieHeader(request)).toBeNull();
  });
});
