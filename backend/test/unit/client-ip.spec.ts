import { getClientIp } from '../../src/shared/http/client-ip';

function request(headers: Record<string, string | string[] | undefined>, ip?: string) {
  return { headers, ip } as any;
}

describe('getClientIp', () => {
  it('uses the x-client-ip header set by the edge proxy', () => {
    expect(getClientIp(request({ 'x-client-ip': '41.230.12.7' }, '10.0.0.5'))).toBe(
      '41.230.12.7',
    );
  });

  it('uses the first value when x-client-ip carries several', () => {
    expect(
      getClientIp(request({ 'x-client-ip': ' 41.230.12.7 , 10.0.0.9' }, '10.0.0.5')),
    ).toBe('41.230.12.7');
    expect(getClientIp(request({ 'x-client-ip': ['197.0.0.1', '10.0.0.9'] }, '10.0.0.5'))).toBe(
      '197.0.0.1',
    );
  });

  it('falls back to req.ip when the header is absent or blank', () => {
    expect(getClientIp(request({}, '10.0.0.5'))).toBe('10.0.0.5');
    expect(getClientIp(request({ 'x-client-ip': '  ' }, '10.0.0.5'))).toBe('10.0.0.5');
  });

  it('returns "unknown" when nothing identifies the client', () => {
    expect(getClientIp(request({}))).toBe('unknown');
  });
});
