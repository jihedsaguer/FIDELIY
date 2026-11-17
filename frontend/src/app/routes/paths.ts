export const paths = {
  home: '/',
  customerLogin: '/customer/login',
  customerDashboard: '/customer',
  merchantLogin: '/merchant/login',
  merchantRegister: '/merchant/register',
  merchantDashboard: '/merchant',
  merchantOnboarding: '/merchant/onboarding',
  merchantBranches: '/merchant/branches',
  merchantPrograms: '/merchant/programs',
  publicQr: '/qr/:qrId',
  merchantScan: '/merchant/scan',
} as const;
