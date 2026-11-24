import type { BusinessSetup } from '../features/business-onboarding/types/businessOnboarding.types';
import type { AuthSession } from '../features/auth/types/auth.types';

const now = '2026-01-01T00:00:00.000Z';

export function createBusinessSetup(): BusinessSetup {
  return { status: 'required', business: null, branches: [] };
}

export function createPopulatedSetup(): BusinessSetup {
  return {
    status: 'in_progress',
    business: {
      id: 'business-1',
      publicQrId: '00000000-0000-4000-8000-000000000001',
      name: 'Cafe FIDELIY',
      description: null,
      branchCount: 0,
      businessPhone: '+21612345678',
      phonePubliclyDisplayed: false,
      phoneVisibilityConfigured: true,
      logoUrl: 'https://example.com/logo.png',
      theme: { primaryColor: '#123456', accentColor: '#ABCDEF' },
      onboardingCompleted: false,
      createdAt: now,
      updatedAt: now,
    },
    branches: [],
  };
}

export function createSession(): AuthSession {
  return {
    user: { id: 'user-1', name: 'Test Merchant', email: 'merchant@example.com' },
    session: { id: 'session-1', expiresAt: '2030-01-01T00:00:00.000Z' },
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createMockBackend(options: {
  authenticated?: boolean;
  setup?: BusinessSetup;
  denyMerchant?: boolean;
} = {}) {
  let session = options.authenticated ? createSession() : null;
  let setup = structuredClone(options.setup ?? createBusinessSetup());
  const calls: Array<{ path: string; method: string; body: unknown }> = [];
  let failNextPath: string | null = null;

  const fetchMock = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(input instanceof Request ? input.url : String(input), 'http://localhost');
    const request = input instanceof Request ? input : undefined;
    const method = init.method ?? request?.method ?? 'GET';
    const rawBody = init.body ?? (request ? await request.clone().text() : undefined);
    const body = typeof rawBody === 'string' && rawBody ? JSON.parse(rawBody) as Record<string, unknown> : {};
    calls.push({ path: url.pathname, method, body });

    if (failNextPath === url.pathname) {
      failNextPath = null;
      throw new TypeError('Network unavailable');
    }

    if (url.pathname === '/api/auth/get-session') return jsonResponse(session);
    if (url.pathname === '/api/auth/sign-out') {
      session = null;
      return jsonResponse({ success: true });
    }
    if (url.pathname === '/api/auth/sign-in/email' || url.pathname === '/api/auth/sign-up/email') {
      session = createSession();
      return jsonResponse({ user: session.user });
    }
    if (url.pathname === '/api/auth/phone-number/send-otp') return jsonResponse({ status: true });
    if (url.pathname === '/api/auth/phone-number/verify') {
      session = createSession();
      return jsonResponse({ status: true, user: session.user });
    }
    if (url.pathname === '/api/customers/profile') {
      return jsonResponse({ message: 'ok', userId: session?.user.id, customerAccount: { id: 'customer-1' } });
    }
    if (url.pathname === '/api/merchants/profile') {
      if (options.denyMerchant) return jsonResponse({ message: 'Forbidden' }, 403);
      return jsonResponse({ message: 'ok', userId: session?.user.id, merchantAccount: { id: 'merchant-1' } });
    }
    if (url.pathname === '/api/merchants/business-setup' && method === 'GET') return jsonResponse(setup);

    if (url.pathname === '/api/merchants/business-setup/business' && method === 'POST') {
      setup.status = 'in_progress';
      setup.business = {
        id: 'business-1',
        publicQrId: '00000000-0000-4000-8000-000000000001',
        name: String(body.name),
        description: null,
        branchCount: 0,
        businessPhone: null,
        phonePubliclyDisplayed: false,
        phoneVisibilityConfigured: false,
        logoUrl: null,
        theme: null,
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
      };
      return jsonResponse(setup, 201);
    }
    if (url.pathname === '/api/merchants/business-setup/business' && method === 'PATCH') {
      if (setup.business) {
        if (typeof body.name === 'string') setup.business.name = body.name;
        if (typeof body.logoUrl === 'string') setup.business.logoUrl = body.logoUrl;
        if (typeof body.businessPhone === 'string') setup.business.businessPhone = body.businessPhone;
        if (typeof body.phonePubliclyDisplayed === 'boolean') {
          setup.business.phonePubliclyDisplayed = body.phonePubliclyDisplayed;
          setup.business.phoneVisibilityConfigured = true;
        }
        if (typeof body.theme === 'object' && body.theme !== null) {
          const theme = body.theme as { primaryColor: string; accentColor: string };
          setup.business.theme = theme;
        }
      }
      return jsonResponse(setup);
    }
    if (url.pathname === '/api/merchants/business-setup/first-branch' && method === 'POST') {
      if (setup.business) {
        setup.business.branchCount = 1;
        setup.branches = [{
          id: 'branch-1',
          businessId: 'business-1',
          name: String(body.name),
          address: String(body.address),
          phone: null,
          qrCodeId: 'qr-1',
          createdAt: now,
          updatedAt: now,
        }];
      }
      return jsonResponse(setup, 201);
    }
    if (url.pathname === '/api/merchants/business-setup/first-branch' && method === 'PATCH') {
      const branch = setup.branches[0];
      if (branch) {
        if (typeof body.name === 'string') branch.name = body.name;
        if (typeof body.address === 'string') branch.address = body.address;
      }
      return jsonResponse(setup);
    }
    if (url.pathname === '/api/merchants/business-setup/complete') {
      setup.status = 'complete';
      if (setup.business) setup.business.onboardingCompleted = true;
      return jsonResponse(setup, 201);
    }
    return jsonResponse({ message: 'Not found' }, 404);
  };

  return {
    fetch: fetchMock,
    calls,
    getSetup: () => structuredClone(setup),
    failNext: (path: string) => { failNextPath = path; },
  };
}
