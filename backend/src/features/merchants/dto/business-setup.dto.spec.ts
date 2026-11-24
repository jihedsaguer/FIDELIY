import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateBusinessSetupDto } from './business-setup.dto';
import { LOGO_PRESET_IDS } from '../logo-presets';

function logoUrlErrors(logoUrl: unknown) {
  const dto = plainToInstance(UpdateBusinessSetupDto, { logoUrl });
  return validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).filter(
    (error) => error.property === 'logoUrl',
  );
}

describe('UpdateBusinessSetupDto.logoUrl', () => {
  it('accepts an https URL', () => {
    expect(logoUrlErrors('https://cdn.example.com/logo.png')).toEqual([]);
  });

  it('accepts an http URL', () => {
    expect(logoUrlErrors('http://example.com/logo.png')).toEqual([]);
  });

  it.each(['preset:coffee', 'preset:initial', 'preset:ice-cream', 'preset:barber'])(
    'accepts the preset value %s',
    (value) => {
      expect(logoUrlErrors(value)).toEqual([]);
    },
  );

  it('accepts every preset id of the allowlist', () => {
    for (const id of LOGO_PRESET_IDS) {
      expect(logoUrlErrors(`preset:${id}`)).toEqual([]);
    }
  });

  it('keeps the agreed allowlist', () => {
    expect([...LOGO_PRESET_IDS]).toEqual([
      'coffee',
      'bakery',
      'restaurant',
      'pizza',
      'ice-cream',
      'cake',
      'grocery',
      'clothing',
      'barber',
      'beauty',
      'flowers',
      'shop',
      'initial',
    ]);
  });

  it('accepts null (clears the logo) and undefined (field not sent)', () => {
    expect(logoUrlErrors(null)).toEqual([]);
    expect(logoUrlErrors(undefined)).toEqual([]);
  });

  it.each([
    'preset:pharmacy',
    'preset:',
    'preset',
    'preset:COFFEE',
    'Preset:coffee',
    ' preset:coffee',
    'preset:coffee ',
    'preset: coffee',
    'preset:coffee:extra',
    'preset:coffee/x',
  ])('rejects the malformed or unknown preset value %j', (value) => {
    expect(logoUrlErrors(value)).not.toEqual([]);
  });

  it.each([
    'javascript:alert(1)',
    'ftp://example.com/logo.png',
    'data:image/png;base64,AAAA',
    'http://localhost/logo.png',
    'logos/abc.png',
    '',
  ])('rejects the non http(s) or non-public value %j', (value) => {
    expect(logoUrlErrors(value)).not.toEqual([]);
  });

  it('rejects non-string values', () => {
    expect(logoUrlErrors(42)).not.toEqual([]);
    expect(logoUrlErrors({ url: 'https://example.com' })).not.toEqual([]);
  });

  it('keeps the 2048-character limit', () => {
    const base = 'https://example.com/';
    expect(logoUrlErrors(base + 'a'.repeat(2048 - base.length))).toEqual([]);
    expect(logoUrlErrors(base + 'a'.repeat(2049 - base.length))).not.toEqual([]);
  });
});
