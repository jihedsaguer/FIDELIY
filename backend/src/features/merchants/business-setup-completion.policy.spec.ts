import {
  BusinessSetupCompletionData,
  getMissingBusinessSetupFields,
} from './business-setup-completion.policy';

const completeSetup: BusinessSetupCompletionData = {
  name: 'Fideliy Cafe',
  business_phone: '+21670000000',
  phone_visibility_configured: true,
  logo_url: 'https://example.test/logo.png',
  logo_storage_key: null,
  theme_primary_color: '#123456',
  theme_accent_color: '#ABCDEF',
  branch_name: 'Main',
  branch_address: '1 Test Street',
};

describe('getMissingBusinessSetupFields', () => {
  it('keeps the required fields and their API order', () => {
    expect(
      getMissingBusinessSetupFields({
        ...completeSetup,
        name: ' ',
        business_phone: ' ',
        phone_visibility_configured: false,
        logo_url: null,
        theme_primary_color: 'blue',
        theme_accent_color: null,
        branch_name: ' ',
        branch_address: null,
      }),
    ).toEqual([
      'business.name',
      'business.businessPhone',
      'business.phonePubliclyDisplayed',
      'business.logo',
      'business.theme.primaryColor',
      'business.theme.accentColor',
      'firstBranch.name',
      'firstBranch.address',
    ]);
  });

  it('accepts either a URL logo or a device storage key', () => {
    expect(getMissingBusinessSetupFields(completeSetup)).toEqual([]);
    expect(
      getMissingBusinessSetupFields({
        ...completeSetup,
        logo_url: null,
        logo_storage_key: 'logos/fideliy.png',
      }),
    ).toEqual([]);
  });

  it('reports a missing business row', () => {
    expect(getMissingBusinessSetupFields(undefined)).toEqual(['business']);
  });
});
