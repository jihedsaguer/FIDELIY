/**
 * Phase 1B (Corrected): Guard Unit Tests
 *
 * Tests actual canActivate() method of CustomerGuard and MerchantGuard.
 * Guards invoke TenantContextService.querySingleWithContext to check account existence.
 * 
 * Verifies:
 * - Guard queries correct table (customer_accounts or merchant_accounts)
 * - Guard rejects unauthenticated requests (401)
 * - Guard rejects missing account (403)
 * - Guard accepts valid account (200)
 * - Guard uses TenantContextService correctly
 */

import { Request } from 'express';
import { CustomerGuard } from '../../src/shared/guards/customer.guard';
import { MerchantGuard } from '../../src/shared/guards/merchant.guard';

describe('Guards - Account Verification', () => {
  let tenantContextService: any;
  let mockExecutionContext: any;
  let mockRequest: Partial<Request>;

  beforeEach(() => {
    // Create mock TenantContextService
    tenantContextService = {
      querySingleWithContext: jest.fn(),
    };

    // Create mock Request
    mockRequest = {
      user: { id: 'user-123' },
    };

    // Create mock ExecutionContext (from @nestjs/common)
    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CustomerGuard - canActivate', () => {
    let guard: CustomerGuard;

    beforeEach(() => {
      guard = new CustomerGuard(tenantContextService);
    });

    it('should invoke actual canActivate method', async () => {
      tenantContextService.querySingleWithContext.mockResolvedValueOnce({ id: 'account-123' });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when user not authenticated', async () => {
      mockRequest.user = undefined;

      try {
        await guard.canActivate(mockExecutionContext);
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.getStatus?.()).toBe(401); // UnauthorizedException status
      }
    });

    it('should throw ForbiddenException when customer account does not exist', async () => {
      tenantContextService.querySingleWithContext.mockResolvedValueOnce(null);

      try {
        await guard.canActivate(mockExecutionContext);
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.getStatus?.()).toBe(403); // ForbiddenException status
      }
    });

    it('should query customer_accounts table with user ID', async () => {
      tenantContextService.querySingleWithContext.mockResolvedValueOnce({ id: 'account-123' });

      await guard.canActivate(mockExecutionContext);

      expect(tenantContextService.querySingleWithContext).toHaveBeenCalled();
      const call = tenantContextService.querySingleWithContext.mock.calls[0];
      expect(call[0]).toBe('user-123'); // userId from user.id
      expect(call[1]).toContain('customer_accounts'); // table name
    });

    it('should return true when customer account exists', async () => {
      tenantContextService.querySingleWithContext.mockResolvedValueOnce({
        id: 'account-123',
        user_id: 'user-123',
      });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });
  });

  describe('MerchantGuard - canActivate', () => {
    let guard: MerchantGuard;

    beforeEach(() => {
      mockRequest.user = { id: 'merchant-123' };
      guard = new MerchantGuard(tenantContextService);
    });

    it('should invoke actual canActivate method', async () => {
      tenantContextService.querySingleWithContext.mockResolvedValueOnce({ id: 'merchant-456' });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when user not authenticated', async () => {
      mockRequest.user = undefined;

      try {
        await guard.canActivate(mockExecutionContext);
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.getStatus?.()).toBe(401); // UnauthorizedException status
      }
    });

    it('should throw ForbiddenException when merchant account does not exist', async () => {
      tenantContextService.querySingleWithContext.mockResolvedValueOnce(null);

      try {
        await guard.canActivate(mockExecutionContext);
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.getStatus?.()).toBe(403); // ForbiddenException status
      }
    });

    it('should query merchant_accounts table with user ID', async () => {
      tenantContextService.querySingleWithContext.mockResolvedValueOnce({ id: 'merchant-456' });

      await guard.canActivate(mockExecutionContext);

      expect(tenantContextService.querySingleWithContext).toHaveBeenCalled();
      const call = tenantContextService.querySingleWithContext.mock.calls[0];
      expect(call[0]).toBe('merchant-123'); // userId from user.id
      expect(call[1]).toContain('merchant_accounts'); // table name
    });

    it('should return true when merchant account exists', async () => {
      tenantContextService.querySingleWithContext.mockResolvedValueOnce({
        id: 'merchant-456',
        user_id: 'merchant-123',
      });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });
  });
});

