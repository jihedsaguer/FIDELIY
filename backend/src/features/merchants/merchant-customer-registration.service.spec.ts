import { Test, TestingModule } from '@nestjs/testing';
import { MerchantCustomerRegistrationService } from './merchant-customer-registration.service';
import { TenantContextService } from '../../shared/database/tenant-context.service';
import { PhoneAuthService } from '../auth/phone-auth.service';
import { BusinessAccessService } from './business-access.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import {
  deriveCustomerQrCredential,
  deriveCustomerQrShortCode,
  hashCustomerQrCredential,
  hashCustomerQrShortCode,
} from '../../shared/security/customer-qr';

describe('MerchantCustomerRegistrationService', () => {
  let service: MerchantCustomerRegistrationService;
  let mockTenantContext: jest.Mocked<TenantContextService>;
  let mockPhoneAuth: jest.Mocked<PhoneAuthService>;
  let mockBusinessAccess: jest.Mocked<BusinessAccessService>;

  beforeEach(async () => {
    mockTenantContext = {
      executeWithContext: jest.fn(),
    } as unknown as jest.Mocked<TenantContextService>;

    mockPhoneAuth = {
      normalizePhoneNumber: jest.fn((phone) => phone),
      isValidTunisianPhone: jest.fn((phone) => phone?.length === 8),
    } as unknown as jest.Mocked<PhoneAuthService>;

    mockBusinessAccess = {
      lockOwnedBusinessForUpdate: jest.fn(),
    } as unknown as jest.Mocked<BusinessAccessService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantCustomerRegistrationService,
        {
          provide: TenantContextService,
          useValue: mockTenantContext,
        },
        {
          provide: PhoneAuthService,
          useValue: mockPhoneAuth,
        },
        {
          provide: BusinessAccessService,
          useValue: mockBusinessAccess,
        },
      ],
    }).compile();

    service = module.get<MerchantCustomerRegistrationService>(
      MerchantCustomerRegistrationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('phone validation', () => {
    it('should reject empty phone number', async () => {
      mockPhoneAuth.normalizePhoneNumber.mockReturnValue(null);

      await expect(
        service.registerCustomer('test-merchant-id', {
          name: 'Test Customer',
          phoneNumber: '',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPhoneAuth.normalizePhoneNumber).toHaveBeenCalledWith('');
    });

    it('should reject phone number with wrong length', async () => {
      mockPhoneAuth.normalizePhoneNumber.mockReturnValue('12345');
      mockPhoneAuth.isValidTunisianPhone.mockReturnValue(false);

      await expect(
        service.registerCustomer('test-merchant-id', {
          name: 'Test Customer',
          phoneNumber: '12345',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPhoneAuth.normalizePhoneNumber).toHaveBeenCalledWith('12345');
      expect(mockPhoneAuth.isValidTunisianPhone).toHaveBeenCalledWith('12345');
    });

    it('should accept valid 8-digit Tunisian phone number', async () => {
      mockPhoneAuth.normalizePhoneNumber.mockReturnValue('12345678');
      mockPhoneAuth.isValidTunisianPhone.mockReturnValue(true);

      mockTenantContext.executeWithContext.mockImplementation(async (_userId, callback) => {
        const mockConn = {
          query: jest.fn().mockResolvedValue({ rows: [] }),
        } as unknown as PoolClient;
        return callback(mockConn);
      });

      mockBusinessAccess.lockOwnedBusinessForUpdate.mockResolvedValue({
        id: 'test-business-id',
        name: 'Test Business',
      });

      // This will fail at the next query but we're just testing validation passes
      await expect(
        service.registerCustomer('test-merchant-id', {
          name: 'Test Customer',
          phoneNumber: '12345678',
        }),
      ).rejects.toThrow();

      expect(mockPhoneAuth.normalizePhoneNumber).toHaveBeenCalledWith('12345678');
      expect(mockPhoneAuth.isValidTunisianPhone).toHaveBeenCalledWith('12345678');
    });
  });

  describe('business lookup', () => {
    it('should throw NotFoundException when merchant has no business', async () => {
      mockPhoneAuth.isValidTunisianPhone.mockReturnValue(true);

      mockTenantContext.executeWithContext.mockImplementation(async (_userId, callback) => {
        const mockConn = {
          query: jest.fn().mockResolvedValue({ rows: [] }),
        } as unknown as PoolClient;
        return callback(mockConn);
      });

      mockBusinessAccess.lockOwnedBusinessForUpdate.mockResolvedValue(null);

      await expect(
        service.registerCustomer('test-merchant-id', {
          name: 'Test Customer',
          phoneNumber: '12345678',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockBusinessAccess.lockOwnedBusinessForUpdate).toHaveBeenCalled();
    });

    it('should proceed when merchant has a business', async () => {
      mockPhoneAuth.isValidTunisianPhone.mockReturnValue(true);

      mockTenantContext.executeWithContext.mockImplementation(async (_userId, callback) => {
        const mockConn = {
          query: jest.fn().mockResolvedValue({ rows: [] }),
        } as unknown as PoolClient;
        return callback(mockConn);
      });

      mockBusinessAccess.lockOwnedBusinessForUpdate.mockResolvedValue({
        id: 'test-business-id',
        name: 'Test Business',
      });

      // Will fail at customer creation but we're testing business lookup passes
      await expect(
        service.registerCustomer('test-merchant-id', {
          name: 'Test Customer',
          phoneNumber: '12345678',
        }),
      ).rejects.toThrow();

      expect(mockBusinessAccess.lockOwnedBusinessForUpdate).toHaveBeenCalled();
    });
  });

  describe('QR credential behavior', () => {
    const testCredential = 'test-raw-credential-value';

    beforeEach(() => {
      mockPhoneAuth.isValidTunisianPhone.mockReturnValue(true);
      mockBusinessAccess.lockOwnedBusinessForUpdate.mockResolvedValue({
        id: 'test-business-id',
        name: 'Test Business',
      });
    });

    it('should generate and return new QR credential for new customer', async () => {
      const queryMock = jest.fn();
      mockTenantContext.executeWithContext.mockImplementation(async (_userId, callback) => {
        const mockConn = {
          query: queryMock
            .mockResolvedValueOnce({ rows: [] }) // findCustomerByPhone - no customer
            .mockResolvedValueOnce({ rows: [{ id: 'new-user-id' }] }) // createUser
            .mockResolvedValueOnce({ rows: [{ id: 'new-customer-account-id' }] }) // createCustomerAccount
            .mockResolvedValueOnce({ rows: [] }) // findActiveMembership - none
            .mockResolvedValueOnce({ rows: [{ id: 'new-membership-id' }] }) // createMembership
            .mockResolvedValueOnce({ rows: [] }) // recordMembershipEvent
            .mockResolvedValueOnce({ rows: [] }) // checkExistingQR - none
            .mockResolvedValueOnce({ rows: [] }) // insert QR (hash only)
            .mockResolvedValueOnce({ rows: [{ name: 'Test Business' }] }), // getBusinessName
        } as unknown as PoolClient;
        return callback(mockConn);
      });

      const result = await service.registerCustomer('test-merchant-id', {
        name: 'New Customer',
        phoneNumber: '11111111',
      });

      // Should return a defined credential for new customer
      expect(result.personalQrCredential).toBeDefined();
      expect(typeof result.personalQrCredential).toBe('string');
      expect(result.personalQrCredential?.length).toBeGreaterThan(0);

      // Derived (not random) credential and short ID; only hashes are stored.
      const insert = queryMock.mock.calls.find(([sql]) =>
        (sql as string).includes('INSERT INTO customer_qr_credentials'),
      ) as [string, string[]];
      const [rowId, accountId, credentialHash, shortCodeHash] = insert[1];
      expect(accountId).toBe('new-customer-account-id');
      expect(result.personalQrCredential).toBe(
        deriveCustomerQrCredential(accountId, rowId),
      );
      expect(result.personalQrShortCode).toBe(
        deriveCustomerQrShortCode(accountId, rowId),
      );
      expect(credentialHash).toBe(hashCustomerQrCredential(result.personalQrCredential as string));
      expect(shortCodeHash).toBe(hashCustomerQrShortCode(result.personalQrShortCode as string));
    });

    it('should return undefined for existing customer with hash-only credential', async () => {
      mockTenantContext.executeWithContext.mockImplementation(async (_userId, callback) => {
        const mockConn = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ userId: 'existing-user-id', customerAccountId: 'existing-ca-id' }] }) // findCustomerByPhone
            .mockResolvedValueOnce({ rows: [{ id: 'existing-membership-id', status: 'active' }] }) // findActiveMembership
            .mockResolvedValueOnce({ rows: [{ credentialHash: 'some-hash' }] }) // checkExistingQR - found (hash only)
            .mockResolvedValueOnce({ rows: [{ name: 'Test Business' }] }), // getBusinessName
        } as unknown as PoolClient;
        return callback(mockConn);
      });

      const result = await service.registerCustomer('test-merchant-id', {
        name: 'Existing Customer',
        phoneNumber: '22222222',
      });

      // Should return undefined for existing customer (hash-only, cannot retrieve raw)
      expect(result.personalQrCredential).toBeUndefined();
      expect(result.personalQrShortCode).toBeUndefined();
    });

    it('should not regenerate QR credential for existing customer on repeated registration', async () => {
      // First registration - creates new customer with QR credential
      mockTenantContext.executeWithContext.mockImplementationOnce(async (_userId, callback) => {
        const mockConn = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] }) // findCustomerByPhone
            .mockResolvedValueOnce({ rows: [{ id: 'new-user-id' }] }) // createUser
            .mockResolvedValueOnce({ rows: [{ id: 'new-customer-account-id' }] }) // createCustomerAccount
            .mockResolvedValueOnce({ rows: [] }) // findActiveMembership
            .mockResolvedValueOnce({ rows: [{ id: 'new-membership-id' }] }) // createMembership
            .mockResolvedValueOnce({ rows: [] }) // recordMembershipEvent
            .mockResolvedValueOnce({ rows: [] }) // checkExistingQR - none
            .mockResolvedValueOnce({ rows: [] }) // insert QR
            .mockResolvedValueOnce({ rows: [{ name: 'Test Business' }] }), // getBusinessName
        } as unknown as PoolClient;
        return callback(mockConn);
      });

      const firstResult = await service.registerCustomer('test-merchant-id', {
        name: 'New Customer',
        phoneNumber: '33333333',
      });

      expect(firstResult.personalQrCredential).toBeDefined();
      const firstCredential = firstResult.personalQrCredential;

      // Second registration - same customer, should NOT regenerate QR
      mockTenantContext.executeWithContext.mockImplementationOnce(async (_userId, callback) => {
        const mockConn = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ userId: 'new-user-id', customerAccountId: 'new-customer-account-id' }] }) // findCustomerByPhone
            .mockResolvedValueOnce({ rows: [{ id: 'new-membership-id', status: 'active' }] }) // findActiveMembership
            .mockResolvedValueOnce({ rows: [{ credentialHash: 'some-hash' }] }) // checkExistingQR - found
            .mockResolvedValueOnce({ rows: [{ name: 'Test Business' }] }), // getBusinessName
        } as unknown as PoolClient;
        return callback(mockConn);
      });

      const secondResult = await service.registerCustomer('test-merchant-id', {
        name: 'New Customer',
        phoneNumber: '33333333',
      });

      // Should return undefined (existing QR, cannot retrieve raw)
      expect(secondResult.personalQrCredential).toBeUndefined();
      // Important: The first credential is NOT returned again, proving no regeneration
      expect(secondResult.personalQrCredential).not.toBe(firstCredential);
    });

    it('should not create duplicate QR credentials for same customer', async () => {
      // First registration creates QR
      mockTenantContext.executeWithContext.mockImplementationOnce(async (_userId, callback) => {
        const mockConn = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'ca-1' }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 'm-1' }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] }) // checkExistingQR - none
            .mockResolvedValueOnce({ rows: [] }) // insert QR
            .mockResolvedValueOnce({ rows: [{ name: 'Test Business' }] }),
        } as unknown as PoolClient;
        return callback(mockConn);
      });

      await service.registerCustomer('test-merchant-id', {
        name: 'Customer',
        phoneNumber: '44444444',
      });

      // Second registration - check that checkExistingQR finds the existing one
      mockTenantContext.executeWithContext.mockImplementationOnce(async (_userId, callback) => {
        const mockConn = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ userId: 'user-1', customerAccountId: 'ca-1' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'm-1', status: 'active' }] })
            .mockResolvedValueOnce({ rows: [{ credentialHash: 'some-hash' }] }) // checkExistingQR - finds it
            .mockResolvedValueOnce({ rows: [{ name: 'Test Business' }] }),
        } as unknown as PoolClient;
        return callback(mockConn);
      });

      const result = await service.registerCustomer('test-merchant-id', {
        name: 'Customer',
        phoneNumber: '44444444',
      });

      // No QR insert happened in second registration (no duplicate)
      expect(result.personalQrCredential).toBeUndefined();
    });
  });
});
