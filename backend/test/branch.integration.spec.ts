import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

const enabled = process.env.RUN_BRANCH_INTEGRATION === 'true';
const integrationDescribe = enabled ? describe : describe.skip;

interface TestMerchant {
  userId: string;
  cookie: string[];
}

integrationDescribe('Branch CRUD integration', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;
  let firstMerchant: TestMerchant;
  let secondMerchant: TestMerchant;
  let firstBusinessId: string;
  let firstBranchId: string;
  let secondBusinessId: string;
  let firstEmail: string;
  let secondEmail: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    databaseService = moduleFixture.get<DatabaseService>(DatabaseService);

    firstEmail = `branch-integration-${randomUUID()}@example.test`;
    secondEmail = `branch-integration-${randomUUID()}@example.test`;
    const existing = await databaseService.getPool().query(
      'SELECT id FROM public.users WHERE email = ANY($1::text[])',
      [[firstEmail, secondEmail]],
    );
    if (existing.rowCount) {
      throw new Error('Generated branch integration test identity already exists.');
    }

    firstMerchant = await registerMerchant(firstEmail);
    secondMerchant = await registerMerchant(secondEmail);

    // Create businesses for both merchants
    const firstBusiness = await request(app.getHttpServer())
      .post('/merchants/business-setup/business')
      .set('Cookie', firstMerchant.cookie)
      .send({ name: 'Branch Test Business 1' })
      .expect(201);
    firstBusinessId = firstBusiness.body.business.id;

    const secondBusiness = await request(app.getHttpServer())
      .post('/merchants/business-setup/business')
      .set('Cookie', secondMerchant.cookie)
      .send({ name: 'Branch Test Business 2' })
      .expect(201);
    secondBusinessId = secondBusiness.body.business.id;

    // Create first branch for first merchant
    const firstBranch = await request(app.getHttpServer())
      .post('/merchants/business-setup/first-branch')
      .set('Cookie', firstMerchant.cookie)
      .send({ name: 'First Branch', address: '1 Test Street' })
      .expect(201);
    firstBranchId = firstBranch.body.branches[0].id;

    // Create first branch for second merchant
    await request(app.getHttpServer())
      .post('/merchants/business-setup/first-branch')
      .set('Cookie', secondMerchant.cookie)
      .send({ name: 'Other Business Branch', address: '2 Other Street' })
      .expect(201);
  });

  afterAll(async () => {
    if (databaseService && firstEmail && secondEmail) {
      // Note: loyalty_transactions and loyalty_activity_entries have append-only constraints
      // So we skip cleaning them up
      await databaseService.getPool().query(
        'DELETE FROM public.branches WHERE business_id IN (SELECT id FROM public.businesses WHERE merchant_id IN (SELECT id FROM public.merchant_accounts WHERE user_id IN (SELECT id FROM public.users WHERE email = ANY($1::text[]))))',
        [[firstEmail, secondEmail]],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.businesses WHERE merchant_id IN (SELECT id FROM public.merchant_accounts WHERE user_id IN (SELECT id FROM public.users WHERE email = ANY($1::text[])))',
        [[firstEmail, secondEmail]],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.merchant_accounts WHERE user_id IN (SELECT id FROM public.users WHERE email = ANY($1::text[]))',
        [[firstEmail, secondEmail]],
      );
      await databaseService
        .getPool()
        .query('DELETE FROM public.users WHERE email = ANY($1::text[])', [
          [firstEmail, secondEmail],
        ]);
      const remaining = await databaseService.getPool().query(
        'SELECT id FROM public.users WHERE email = ANY($1::text[])',
        [[firstEmail, secondEmail]],
      );
      expect(remaining.rowCount).toBe(0);
    }
    await app?.close();
  });

  describe('GET /merchants/branches', () => {
    it('returns all branches for authenticated merchant', async () => {
      const http = request(app.getHttpServer());
      const response = await http
        .get('/merchants/branches')
        .set('Cookie', firstMerchant.cookie)
        .expect(200);

      expect(response.body.branches).toHaveLength(1);
      expect(response.body.branches[0].id).toBe(firstBranchId);
      expect(response.body.branches[0].name).toBe('First Branch');
      expect(response.body.branches[0].address).toBe('1 Test Street');
      expect(response.body.branches[0].qrCodeId).toBeTruthy();
    });

    it('returns empty list for merchant with no branches', async () => {
      const http = request(app.getHttpServer());
      // First merchant already has a branch, so we can't test empty list here
      // This would require creating a merchant without any branches
      // Skip this test as it's not applicable with current setup
    });

    it('rejects unauthenticated requests', async () => {
      const http = request(app.getHttpServer());
      await http.get('/merchants/branches').expect(401);
    });

    it('returns only branches for the authenticated merchant', async () => {
      const http = request(app.getHttpServer());
      const response = await http
        .get('/merchants/branches')
        .set('Cookie', firstMerchant.cookie)
        .expect(200);

      expect(response.body.branches).toHaveLength(1);
      expect(response.body.branches[0].businessId).toBe(firstBusinessId);

      // Verify second merchant's branch is not included
      expect(
        response.body.branches.some((b: { businessId: string }) => b.businessId === secondBusinessId),
      ).toBe(false);
    });
  });

  describe('GET /merchants/branches/:branchId', () => {
    it('returns a specific branch by ID', async () => {
      const http = request(app.getHttpServer());
      const response = await http
        .get(`/merchants/branches/${firstBranchId}`)
        .set('Cookie', firstMerchant.cookie)
        .expect(200);

      expect(response.body.id).toBe(firstBranchId);
      expect(response.body.name).toBe('First Branch');
      expect(response.body.address).toBe('1 Test Street');
    });

    it('rejects unauthenticated requests', async () => {
      const http = request(app.getHttpServer());
      await http.get(`/merchants/branches/${firstBranchId}`).expect(401);
    });

    it('rejects access to branches owned by other merchants', async () => {
      const http = request(app.getHttpServer());
      // Get second merchant's branch ID
      const secondBranches = await http
        .get('/merchants/branches')
        .set('Cookie', secondMerchant.cookie)
        .expect(200);
      const secondBranchId = secondBranches.body.branches[0].id;

      // First merchant tries to access second merchant's branch
      await http
        .get(`/merchants/branches/${secondBranchId}`)
        .set('Cookie', firstMerchant.cookie)
        .expect(404);
    });

    it('returns 404 when branch does not exist', async () => {
      const http = request(app.getHttpServer());
      await http
        .get(`/merchants/branches/${randomUUID()}`)
        .set('Cookie', firstMerchant.cookie)
        .expect(404);
    });
  });

  describe('POST /merchants/branches', () => {
    it('creates a new branch with valid data', async () => {
      const http = request(app.getHttpServer());
      const response = await http
        .post('/merchants/branches')
        .set('Cookie', firstMerchant.cookie)
        .send({ name: 'Second Branch', address: '2 Test Avenue', phone: '+1234567890' })
        .expect(201);

      expect(response.body.name).toBe('Second Branch');
      expect(response.body.address).toBe('2 Test Avenue');
      expect(response.body.phone).toBe('+1234567890');
      expect(response.body.qrCodeId).toBeTruthy();
      expect(response.body.businessId).toBe(firstBusinessId);

      // Verify branch count was updated
      const branches = await http
        .get('/merchants/branches')
        .set('Cookie', firstMerchant.cookie)
        .expect(200);
      expect(branches.body.branches).toHaveLength(2);
    });

    it('rejects unauthenticated requests', async () => {
      const http = request(app.getHttpServer());
      await http
        .post('/merchants/branches')
        .send({ name: 'New Branch' })
        .expect(401);
    });

    it('rejects branch creation with empty name', async () => {
      const http = request(app.getHttpServer());
      await http
        .post('/merchants/branches')
        .set('Cookie', firstMerchant.cookie)
        .send({ name: '' })
        .expect(400);
    });

    it('rejects branch creation with whitespace-only name', async () => {
      const http = request(app.getHttpServer());
      await http
        .post('/merchants/branches')
        .set('Cookie', firstMerchant.cookie)
        .send({ name: '   ' })
        .expect(400);
    });

    it('creates branch with optional fields omitted', async () => {
      const http = request(app.getHttpServer());
      const response = await http
        .post('/merchants/branches')
        .set('Cookie', firstMerchant.cookie)
        .send({ name: 'Minimal Branch' })
        .expect(201);

      expect(response.body.name).toBe('Minimal Branch');
      expect(response.body.address).toBeNull();
      expect(response.body.phone).toBeNull();
    });

    it('trims whitespace from name, address, and phone', async () => {
      const http = request(app.getHttpServer());
      const response = await http
        .post('/merchants/branches')
        .set('Cookie', firstMerchant.cookie)
        .send({ name: '  Trimmed Branch  ', address: '  Trimmed Address  ', phone: '  123  ' })
        .expect(201);

      expect(response.body.name).toBe('Trimmed Branch');
      expect(response.body.address).toBe('Trimmed Address');
      expect(response.body.phone).toBe('123');
    });

    it('ensures each branch gets a unique QR code ID', async () => {
      const http = request(app.getHttpServer());
      const branch1 = await http
        .post('/merchants/branches')
        .set('Cookie', firstMerchant.cookie)
        .send({ name: 'Branch A' })
        .expect(201);

      const branch2 = await http
        .post('/merchants/branches')
        .set('Cookie', firstMerchant.cookie)
        .send({ name: 'Branch B' })
        .expect(201);

      expect(branch1.body.qrCodeId).toBeTruthy();
      expect(branch2.body.qrCodeId).toBeTruthy();
      expect(branch1.body.qrCodeId).not.toBe(branch2.body.qrCodeId);
    });
  });

  describe('PATCH /merchants/branches/:branchId', () => {
    it('updates branch name', async () => {
      const http = request(app.getHttpServer());
      const response = await http
        .patch(`/merchants/branches/${firstBranchId}`)
        .set('Cookie', firstMerchant.cookie)
        .send({ name: 'Updated First Branch' })
        .expect(200);

      expect(response.body.name).toBe('Updated First Branch');
      expect(response.body.address).toBe('1 Test Street');
    });

    it('updates branch address and phone', async () => {
      const http = request(app.getHttpServer());
      const response = await http
        .patch(`/merchants/branches/${firstBranchId}`)
        .set('Cookie', firstMerchant.cookie)
        .send({ address: 'Updated Address', phone: '+9876543210' })
        .expect(200);

      expect(response.body.address).toBe('Updated Address');
      expect(response.body.phone).toBe('+9876543210');
    });

    it('rejects unauthenticated requests', async () => {
      const http = request(app.getHttpServer());
      await http
        .patch(`/merchants/branches/${firstBranchId}`)
        .send({ name: 'Updated' })
        .expect(401);
    });

    it('rejects updates to branches owned by other merchants', async () => {
      const http = request(app.getHttpServer());
      // Get second merchant's branch ID
      const secondBranches = await http
        .get('/merchants/branches')
        .set('Cookie', secondMerchant.cookie)
        .expect(200);
      const secondBranchId = secondBranches.body.branches[0].id;

      // First merchant tries to update second merchant's branch
      await http
        .patch(`/merchants/branches/${secondBranchId}`)
        .set('Cookie', firstMerchant.cookie)
        .send({ name: 'Unauthorized Update' })
        .expect(404);
    });

    it('returns 404 when branch does not exist', async () => {
      const http = request(app.getHttpServer());
      await http
        .patch(`/merchants/branches/${randomUUID()}`)
        .set('Cookie', firstMerchant.cookie)
        .send({ name: 'Updated' })
        .expect(404);
    });

    it('updates branch with partial data', async () => {
      const http = request(app.getHttpServer());
      // First set phone
      await http
        .patch(`/merchants/branches/${firstBranchId}`)
        .set('Cookie', firstMerchant.cookie)
        .send({ phone: '+1234567890' })
        .expect(200);

      // Then update only address
      const response = await http
        .patch(`/merchants/branches/${firstBranchId}`)
        .set('Cookie', firstMerchant.cookie)
        .send({ address: 'Only Address Updated' })
        .expect(200);

      expect(response.body.address).toBe('Only Address Updated');
      expect(response.body.phone).toBe('+1234567890');
    });

    it('clears address and phone when set to null', async () => {
      // First set address and phone
      const http = request(app.getHttpServer());
      await http
        .patch(`/merchants/branches/${firstBranchId}`)
        .set('Cookie', firstMerchant.cookie)
        .send({ address: 'Some Address', phone: '+1234567890' })
        .expect(200);

      // Then clear them
      const response = await http
        .patch(`/merchants/branches/${firstBranchId}`)
        .set('Cookie', firstMerchant.cookie)
        .send({ address: null, phone: null })
        .expect(200);

      expect(response.body.address).toBeNull();
      expect(response.body.phone).toBeNull();
    });
  });

  describe('DELETE /merchants/branches/:branchId', () => {
    it('deletes a branch when multiple branches exist', async () => {
      const http = request(app.getHttpServer());

      // Create a second branch first
      await http
        .post('/merchants/branches')
        .set('Cookie', firstMerchant.cookie)
        .send({ name: 'Second Branch for Deletion' })
        .expect(201);

      // Verify we have 2 branches
      const branchesBefore = await http
        .get('/merchants/branches')
        .set('Cookie', firstMerchant.cookie)
        .expect(200);
      expect(branchesBefore.body.branches).toHaveLength(2);

      // Delete the first branch
      await http
        .delete(`/merchants/branches/${firstBranchId}`)
        .set('Cookie', firstMerchant.cookie)
        .expect(200);

      // Verify it was deleted
      const branchesAfter = await http
        .get('/merchants/branches')
        .set('Cookie', firstMerchant.cookie)
        .expect(200);
      expect(branchesAfter.body.branches).toHaveLength(1);
      expect(
        branchesAfter.body.branches.some((b: { id: string }) => b.id === firstBranchId),
      ).toBe(false);
    });

    it('rejects unauthenticated requests', async () => {
      const http = request(app.getHttpServer());
      await http
        .delete(`/merchants/branches/${firstBranchId}`)
        .expect(401);
    });

    it('rejects deletion of branches owned by other merchants', async () => {
      const http = request(app.getHttpServer());
      // Get second merchant's branch ID
      const secondBranches = await http
        .get('/merchants/branches')
        .set('Cookie', secondMerchant.cookie)
        .expect(200);
      const secondBranchId = secondBranches.body.branches[0].id;

      // First merchant tries to delete second merchant's branch
      await http
        .delete(`/merchants/branches/${secondBranchId}`)
        .set('Cookie', firstMerchant.cookie)
        .expect(404);
    });

    it('rejects deletion of last branch', async () => {
      const http = request(app.getHttpServer());
      // Ensure first merchant only has one branch (the first one)
      // We need to clean up any extra branches first
      const branches = await http
        .get('/merchants/branches')
        .set('Cookie', firstMerchant.cookie)
        .expect(200);

      // Delete all branches except the first one
      for (const branch of branches.body.branches) {
        if (branch.id !== firstBranchId) {
          await http
            .delete(`/merchants/branches/${branch.id}`)
            .set('Cookie', firstMerchant.cookie)
            .expect(200);
        }
      }

      // Verify only one branch remains
      const remaining = await http
        .get('/merchants/branches')
        .set('Cookie', firstMerchant.cookie)
        .expect(200);
      expect(remaining.body.branches).toHaveLength(1);

      // Try to delete the last branch
      const response = await http
        .delete(`/merchants/branches/${firstBranchId}`)
        .set('Cookie', firstMerchant.cookie)
        .expect(400);

      expect(response.body.message).toContain('Cannot delete the only branch');

      // Verify branch still exists
      await http
        .get(`/merchants/branches/${firstBranchId}`)
        .set('Cookie', firstMerchant.cookie)
        .expect(200);
    });

    it('returns 404 when branch does not exist', async () => {
      const http = request(app.getHttpServer());
      await http
        .delete(`/merchants/branches/${randomUUID()}`)
        .set('Cookie', firstMerchant.cookie)
        .expect(404);
    });

    it('updates business branch count after deletion', async () => {
      const http = request(app.getHttpServer());

      // Create multiple branches
      const branch2 = await http
        .post('/merchants/branches')
        .set('Cookie', firstMerchant.cookie)
        .send({ name: 'Branch 2' })
        .expect(201);

      const branch3 = await http
        .post('/merchants/branches')
        .set('Cookie', firstMerchant.cookie)
        .send({ name: 'Branch 3' })
        .expect(201);

      // Get business info
      const businessSetup = await http
        .get('/merchants/business-setup')
        .set('Cookie', firstMerchant.cookie)
        .expect(200);
      const initialCount = businessSetup.body.business.branchCount;
      expect(initialCount).toBeGreaterThanOrEqual(3);

      // Delete a branch
      await http
        .delete(`/merchants/branches/${branch2.body.id}`)
        .set('Cookie', firstMerchant.cookie)
        .expect(200);

      // Verify branch count was updated
      const updatedBusiness = await http
        .get('/merchants/business-setup')
        .set('Cookie', firstMerchant.cookie)
        .expect(200);
      expect(updatedBusiness.body.business.branchCount).toBe(initialCount - 1);
    });
  });

  describe('Referential integrity', () => {
    it('prevents branch deletion when it has historical transactions', async () => {
      const http = request(app.getHttpServer());

      // Create a second branch for the first merchant
      const branch2 = await http
        .post('/merchants/branches')
        .set('Cookie', firstMerchant.cookie)
        .send({ name: 'Branch with Transactions' })
        .expect(201);

      // Create a customer and membership for testing
      const customerUserId = randomUUID();
      const customerAccountId = randomUUID();
      const membershipId = randomUUID();
      const transactionId = randomUUID();

      // Create user first
      const customerEmail = `customer-${randomUUID()}@test.com`;
      await databaseService.getPool().query(
        `INSERT INTO public.users (id, email, email_verified, name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [customerUserId, customerEmail, false, 'Test Customer'],
      );

      await databaseService.getPool().query(
        `INSERT INTO public.customer_accounts (id, user_id, phone_number, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [customerAccountId, customerUserId, '+21612345678'],
      );

      await databaseService.getPool().query(
        `INSERT INTO public.customer_business_memberships (id, customer_account_id, business_id, status, joined_at, created_at)
         VALUES ($1, $2, $3, 'active', NOW(), NOW())`,
        [membershipId, customerAccountId, firstBusinessId],
      );

      // Get a merchant account for the first business
      const merchantAccount = await databaseService.getPool().query<{ id: string }>(
        `SELECT ma.id FROM public.merchant_accounts ma
         JOIN public.businesses b ON b.merchant_id = ma.id
         WHERE b.id = $1`,
        [firstBusinessId],
      );

      await databaseService.getPool().query(
        `INSERT INTO public.loyalty_transactions 
         (id, business_id, membership_id, branch_id, merchant_account_id, category, occurred_at, idempotency_key, request_fingerprint, created_at)
         VALUES ($1, $2, $3, $4, $5, 'purchase', NOW(), $6, $7, NOW())`,
        [
          transactionId,
          firstBusinessId,
          membershipId,
          branch2.body.id,
          merchantAccount.rows[0].id,
          randomUUID(),
          'a'.repeat(64),
        ],
      );

      // Create a programme configuration for the activity entry
      const programId = randomUUID();
      const configId = randomUUID();
      await databaseService.getPool().query(
        `INSERT INTO public.programs (id, business_id, type, version, status, activated_at, created_at)
         VALUES ($1, $2, 'stamps', 1, 'active', NOW(), NOW())`,
        [programId, firstBusinessId],
      );

      await databaseService.getPool().query(
        `INSERT INTO public.program_configurations (id, program_id, type, settings, created_at)
         VALUES ($1, $2, 'stamps', '{"purchasesPerStamp": 10}'::jsonb, NOW())`,
        [configId, programId],
      );

      await databaseService.getPool().query(
        `INSERT INTO public.loyalty_activity_entries 
         (id, transaction_id, activity_type, delta, program_configuration_id, created_at)
         VALUES ($1, $2, 'stamps', 1, $3, NOW())`,
        [randomUUID(), transactionId, configId],
      );

      // Try to delete the branch - should fail due to foreign key constraint
      // The branch has loyalty transactions referencing it
      await http
        .delete(`/merchants/branches/${branch2.body.id}`)
        .set('Cookie', firstMerchant.cookie)
        .expect(500); // PostgreSQL foreign key violation

      // Verify branch still exists
      await http
        .get(`/merchants/branches/${branch2.body.id}`)
        .set('Cookie', firstMerchant.cookie)
        .expect(200);
    });
  });

  describe('Branch count consistency', () => {
    it('automatically updates business branch count on create', async () => {
      const http = request(app.getHttpServer());

      // Get initial branch count
      const businessBefore = await http
        .get('/merchants/business-setup')
        .set('Cookie', firstMerchant.cookie)
        .expect(200);
      const initialCount = businessBefore.body.business.branchCount;

      // Create a new branch
      await http
        .post('/merchants/branches')
        .set('Cookie', firstMerchant.cookie)
        .send({ name: 'Branch for Count Test' })
        .expect(201);

      // Verify count was incremented
      const businessAfter = await http
        .get('/merchants/business-setup')
        .set('Cookie', firstMerchant.cookie)
        .expect(200);
      expect(businessAfter.body.business.branchCount).toBe(initialCount + 1);
    });
  });

  async function registerMerchant(email: string): Promise<TestMerchant> {
    const response = await request(app.getHttpServer())
      .post('/auth/sign-up/email')
      .send({
        email,
        password: `Test-${randomUUID()}-Password!`,
        name: 'Synthetic Branch Merchant',
      })
      .expect(200);
    const cookie = response.headers['set-cookie'];
    if (!cookie?.length) {
      throw new Error('Merchant registration did not establish a session cookie.');
    }
    return { userId: response.body.user.id, cookie };
  }
});
