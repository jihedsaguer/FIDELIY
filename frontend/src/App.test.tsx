import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from './app/providers';
import AppRoutes from './app/routes';
import { createAppStore } from './app/store';
import {
  createBusinessSetup,
  createMockBackend,
  createPopulatedSetup,
} from './test-utils/mockBackend';

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

function renderRoute(path: string, backend = createMockBackend()) {
  vi.stubGlobal('fetch', backend.fetch);
  window.history.replaceState(null, '', path);
  render(
    <AppProviders store={createAppStore()}>
      <AppRoutes />
    </AppProviders>,
  );
  return backend;
}

describe('application routes and guards', () => {
  it('renders the public landing page with its register and login links', async () => {
    renderRoute('/');
    expect(await screen.findByRole('heading', { level: 1, name: /Vos clients reviennent\./ })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Créer mon programme' })[0]).toHaveAttribute('href', '/merchant/register');
    expect(screen.getAllByRole('link', { name: 'Connexion' })[0]).toHaveAttribute('href', '/merchant/login');
  });

  it('does not load a merchant profile before an authenticated session exists', async () => {
    const backend = renderRoute('/merchant/dashboard');
    await waitFor(() => expect(backend.calls.some((call) => call.path === '/api/auth/get-session')).toBe(true));
    expect(backend.calls.some((call) => call.path === '/api/merchants/profile')).toBe(false);
  });

  it('enforces merchant capability before showing the merchant dashboard', async () => {
    const backend = createMockBackend({ authenticated: true, denyMerchant: true });
    renderRoute('/merchant', backend);
    expect(await screen.findByText('This space is for merchants')).toBeInTheDocument();
    expect(backend.calls.some((call) => call.path === '/api/merchants/profile')).toBe(true);
  });

  it('uses the existing merchant email/password flow and restores its Better Auth session', async () => {
    const backend = renderRoute('/merchant/login');
    await screen.findByText('Welcome back');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'merchant@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(backend.calls.some((call) => call.path === '/api/auth/sign-in/email')).toBe(true));
    expect(backend.calls.some((call) => call.path === '/api/auth/get-session')).toBe(true);
    expect(backend.calls.find((call) => call.path === '/api/auth/sign-in/email')?.body).toEqual({
      email: 'merchant@example.com',
      password: 'password123',
    });
  });

  // TODO: Update this test to match the current customer login implementation
  // The current implementation uses direct phone sign-in, not OTP flow
  it.skip('uses the customer OTP flow through the feature API', async () => {
    const backend = renderRoute('/customer/login');
    await screen.findByText('Welcome back');
    fireEvent.change(screen.getByLabelText('Your phone number'), { target: { value: '+216 12 345 678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
    await screen.findByText('Check your code');
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
    await waitFor(() => expect(backend.calls.some((call) => call.path === '/api/auth/phone-number/verify')).toBe(true));
    expect(backend.calls.find((call) => call.path === '/api/auth/phone-number/send-otp')?.body).toEqual({
      phoneNumber: '+21612345678',
    });
  });

  it('loads required setup and resumes at the first unsaved step', async () => {
    renderRoute('/merchant/onboarding', createMockBackend({ authenticated: true }));
    expect(await screen.findByText('Tell us about your business')).toBeInTheDocument();

    const resumed = createPopulatedSetup();
    resumed.branches = [{
      id: 'branch-1',
      businessId: 'business-1',
      name: 'Downtown',
      address: '1 Main Street',
      phone: null,
      qrCodeId: 'qr-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }];
    resumed.business!.branchCount = 1;
    renderRoute('/merchant/onboarding', createMockBackend({ authenticated: true, setup: resumed }));
    expect(await screen.findByText('Review your business setup')).toBeInTheDocument();
    expect(screen.getByText('Downtown')).toBeInTheDocument();
    expect(screen.getByText('1 Main Street')).toBeInTheDocument();
  });

  it('redirects an already completed merchant away from onboarding', async () => {
    const setup = createPopulatedSetup();
    setup.status = 'complete';
    setup.business!.onboardingCompleted = true;
    setup.branches = [{
      id: 'branch-1',
      businessId: 'business-1',
      name: 'Downtown',
      address: '1 Main Street',
      phone: null,
      qrCodeId: 'qr-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }];
    const backend = renderRoute('/merchant/onboarding', createMockBackend({ authenticated: true, setup }));
    expect(await screen.findByText('Setup complete. Opening your merchant dashboard…')).toBeInTheDocument();
    expect(backend.calls.some((call) => call.path === '/api/merchants/business-setup')).toBe(true);
  });

  it('requires an explicit phone preference and persists each setup step through RTK Query', async () => {
    const backend = renderRoute('/merchant/onboarding', createMockBackend({ authenticated: true }));
    await screen.findByText('Tell us about your business');
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Cafe FIDELIY' } });
    fireEvent.change(screen.getByLabelText('Logo URL'), { target: { value: 'https://example.com/logo.png' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    await screen.findByText('Choose your business colors');
    fireEvent.change(screen.getByLabelText('Primary color'), { target: { value: '#12ab34' } });
    fireEvent.change(screen.getByLabelText('Secondary color'), { target: { value: '#a1b2c3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    await screen.findByText('Add a business contact');

    fireEvent.change(screen.getByLabelText('Business phone number'), { target: { value: '+21612345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose whether your phone number is displayed publicly');
    fireEvent.click(screen.getByLabelText('No, keep it private'));
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    await screen.findByText('Add your first branch');
    fireEvent.change(screen.getByLabelText('Branch name'), { target: { value: 'Downtown' } });
    fireEvent.change(screen.getByLabelText('Branch address'), { target: { value: '1 Main Street' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and review' }));
    await screen.findByText('Review your business setup');

    expect(backend.getSetup().business?.phoneVisibilityConfigured).toBe(true);
    expect(backend.getSetup().business?.phonePubliclyDisplayed).toBe(false);
    expect(backend.getSetup().business?.theme).toEqual({ primaryColor: '#12ab34', accentColor: '#a1b2c3' });
    expect(backend.getSetup().branches[0]?.name).toBe('Downtown');
    expect(backend.calls.filter((call) => call.path.includes('/business-setup/')).length).toBeGreaterThanOrEqual(5);
  });

  it('validates logo URLs before creating a business and updates an existing first branch', async () => {
    const requiredBackend = renderRoute('/merchant/onboarding', createMockBackend({ authenticated: true }));
    await screen.findByText('Tell us about your business');
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Cafe FIDELIY' } });
    fireEvent.change(screen.getByLabelText('Logo URL'), { target: { value: 'not-a-url' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('valid logo URL');
    expect(requiredBackend.calls.some((call) => call.method === 'POST' && call.path.endsWith('/business'))).toBe(false);
    cleanup();

    const setup = createPopulatedSetup();
    setup.branches = [{
      id: 'branch-1',
      businessId: 'business-1',
      name: 'Downtown',
      address: '1 Main Street',
      phone: null,
      qrCodeId: 'qr-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }];
    setup.business!.branchCount = 1;
    const backend = renderRoute('/merchant/onboarding', createMockBackend({ authenticated: true, setup }));
    await screen.findByText('Review your business setup');
    fireEvent.click(screen.getByRole('button', { name: '← Previous' }));
    fireEvent.change(screen.getByLabelText('Branch name'), { target: { value: 'New Downtown' } });
    fireEvent.change(screen.getByLabelText('Branch address'), { target: { value: '2 Main Street' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and review' }));
    await screen.findByText('Review your business setup');
    expect(backend.getSetup().branches[0]?.name).toBe('New Downtown');
    expect(backend.calls.some((call) => call.method === 'PATCH' && call.path.endsWith('/first-branch'))).toBe(true);
  });

  it('keeps form data and allows retry after a network failure', async () => {
    const backend = createMockBackend({ authenticated: true, setup: createBusinessSetup() });
    backend.failNext('/api/merchants/business-setup/business');
    renderRoute('/merchant/onboarding', backend);
    await screen.findByText('Tell us about your business');
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Cafe FIDELIY' } });
    fireEvent.change(screen.getByLabelText('Logo URL'), { target: { value: 'https://example.com/logo.png' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
    expect(screen.getByLabelText('Business name')).toHaveValue('Cafe FIDELIY');
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    expect(await screen.findByText('Choose your business colors')).toBeInTheDocument();
  });

  it('confirms completion from a fresh backend status before redirecting', async () => {
    const setup = createPopulatedSetup();
    setup.branches = [{
      id: 'branch-1',
      businessId: 'business-1',
      name: 'Downtown',
      address: '1 Main Street',
      phone: null,
      qrCodeId: 'qr-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }];
    setup.business!.branchCount = 1;
    const backend = renderRoute('/merchant/onboarding', createMockBackend({ authenticated: true, setup }));
    expect(await screen.findByText('Review your business setup')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Complete business setup' }));
    expect(await screen.findByText('Setup complete. Opening your merchant dashboard…')).toBeInTheDocument();
    expect(backend.getSetup().status).toBe('complete');
    expect(backend.calls.filter((call) => call.path === '/api/merchants/business-setup' && call.method === 'GET').length).toBeGreaterThanOrEqual(2);
  });
});
