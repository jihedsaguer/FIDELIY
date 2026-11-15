import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

const enabled = process.env.RUN_PROGRAM_LIFECYCLE_INTEGRATION === 'true';
const integrationDescribe = enabled ? describe : describe.skip;

interface TestMerchant {
  userId: string;
  cookie: string[];
}

integrationDescribe('Programme lifecycle integration', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;
  let merchant: TestMerchant;
  let businessId: string;
  let email: string;
  let firstBranchId: string;

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

    email = `program-lifecycle-${randomUUID()}@example.test`;
    const existing = await databaseService.getPool().query(
      'SELECT id FROM public.users WHERE email = $1',
      [email],
    );
    if (existing.rowCount) {
      throw new Error('Generated program lifecycle test identity already exists.');
    }

    merchant = await registerMerchant(email);

    // Create business
    const business = await request(app.getHttpServer())
      .post('/merchants/business-setup/business')
      .set('Cookie', merchant.cookie)
      .send({ name: 'Programme Lifecycle Test Business' })
      .expect(201);
    businessId = business.body.business.id;

    // Set business phone and visibility
    await request(app.getHttpServer())
      .patch('/merchants/business-setup/business')
      .set('Cookie', merchant.cookie)
      .send({ businessPhone: '+21670000000', phonePubliclyDisplayed: true })
      .expect(200);

    // Create first branch
    const firstBranch = await request(app.getHttpServer())
      .post('/merchants/business-setup/first-branch')
      .set('Cookie', merchant.cookie)
      .send({ name: 'Main Branch', address: '1 Test Street' })
      .expect(201);
    firstBranchId = firstBranch.body.branches[0].id;

    // Set logo URL to complete setup
    await request(app.getHttpServer())
      .patch('/merchants/business-setup/business')
      .set('Cookie', merchant.cookie)
      .send({ logoUrl: 'https://example.com/logo.png' })
      .expect(200);

    // Set theme colors
    await request(app.getHttpServer())
      .patch('/merchants/business-setup/business')
      .set('Cookie', merchant.cookie)
      .send({ theme: { primaryColor: '#FF0000', accentColor: '#00FF00' } })
      .expect(200);

    await request(app.getHttpServer())
      .post('/merchants/business-setup/complete')
      .set('Cookie', merchant.cookie)
      .expect(201);
  });

  beforeEach(async () => {
    // Clean up all programs and configurations for this business before each test
    if (databaseService && businessId) {
      await databaseService.getPool().query(
        'DELETE FROM public.program_configurations WHERE program_id IN (SELECT id FROM public.programs WHERE business_id = $1)',
        [businessId],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.programs WHERE business_id = $1',
        [businessId],
      );
    }
  });

  afterAll(async () => {
    if (databaseService && email) {
      // Clean up in reverse order
      await databaseService.getPool().query(
        `DELETE FROM public.loyalty_activity_entries
         WHERE transaction_id IN (
           SELECT id FROM public.loyalty_transactions
           WHERE business_id = (
             SELECT id FROM public.businesses WHERE merchant_id IN (
               SELECT id FROM public.merchant_accounts WHERE user_id = (
                 SELECT id FROM public.users WHERE email = $1
               )
             )
           )
         )`,
        [email],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.loyalty_transactions WHERE business_id = (SELECT id FROM public.businesses WHERE merchant_id IN (SELECT id FROM public.merchant_accounts WHERE user_id = (SELECT id FROM public.users WHERE email = $1)))',
        [email],
      );
      await databaseService.getPool().query(
        `DELETE FROM public.program_configurations
         WHERE program_id IN (
           SELECT id FROM public.programs WHERE business_id = (
             SELECT id FROM public.businesses WHERE merchant_id IN (
               SELECT id FROM public.merchant_accounts WHERE user_id = (
                 SELECT id FROM public.users WHERE email = $1
               )
             )
           )
         )`,
        [email],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.programs WHERE business_id = (SELECT id FROM public.businesses WHERE merchant_id IN (SELECT id FROM public.merchant_accounts WHERE user_id = (SELECT id FROM public.users WHERE email = $1)))',
        [email],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.branches WHERE business_id = (SELECT id FROM public.businesses WHERE merchant_id IN (SELECT id FROM public.merchant_accounts WHERE user_id = (SELECT id FROM public.users WHERE email = $1)))',
        [email],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.businesses WHERE merchant_id IN (SELECT id FROM public.merchant_accounts WHERE user_id = (SELECT id FROM public.users WHERE email = $1))',
        [email],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.merchant_accounts WHERE user_id = (SELECT id FROM public.users WHERE email = $1)',
        [email],
      );
      await databaseService
        .getPool()
        .query('DELETE FROM public.users WHERE email = $1', [email]);
      const remaining = await databaseService.getPool().query(
        'SELECT id FROM public.users WHERE email = $1',
        [email],
      );
      expect(remaining.rowCount).toBe(0);
    }
    await app?.close();
  });

  describe('Initial programme creation', () => {
    it('creates the initial programme with structured configuration', async () => {
      const http = request(app.getHttpServer());
      const response = await http
        .post('/programs')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'stamps',
          configurations: {
            stamps: {
              purchasesPerStamp: 10,
              rewardThresholds: [{ stampsRequired: 10, name: 'Free Coffee', isActive: true }],
            },
          },
        })
        .expect(201);

      expect(response.body.type).toBe('stamps');
      expect(response.body.version).toBe(1);
      expect(response.body.status).toBe('active');
      expect(response.body.businessId).toBe(businessId);
    });

    it('rejects duplicate initial programme creation', async () => {
      const http = request(app.getHttpServer());
      // Create first programme
      await http
        .post('/programs')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'stamps',
          configurations: {
            stamps: { purchasesPerStamp: 10, rewardThresholds: [] },
          },
        })
        .expect(201);

      // Try to create another initial programme - should fail
      await http
        .post('/programs')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'points',
          configurations: {
            points: { pointsPerCurrencyUnit: 1, rewardThresholds: [] },
          },
        })
        .expect(409);
    });

    it('rejects unauthenticated programme creation', async () => {
      const http = request(app.getHttpServer());
      await http
        .post('/programs')
        .send({
          type: 'stamps',
          configurations: {
            stamps: { purchasesPerStamp: 10, rewardThresholds: [] },
          },
        })
        .expect(401);
    });

    it('creates programmes with all supported types', async () => {
      const http = request(app.getHttpServer());

      // Clean up any existing programmes first
      await databaseService.getPool().query(
        `DELETE FROM public.program_configurations
         WHERE program_id IN (
           SELECT id FROM public.programs WHERE business_id = $1
         )`,
        [businessId],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.programs WHERE business_id = $1',
        [businessId],
      );

      // Test stamps
      const stamps = await http
        .post('/programs')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'stamps',
          configurations: {
            stamps: { purchasesPerStamp: 5, rewardThresholds: [] },
          },
        })
        .expect(201);
      expect(stamps.body.type).toBe('stamps');

      // Clean up for next test
      await databaseService.getPool().query(
        'DELETE FROM public.program_configurations WHERE program_id = $1',
        [stamps.body.id],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.programs WHERE id = $1',
        [stamps.body.id],
      );

      // Test points
      const points = await http
        .post('/programs')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'points',
          configurations: {
            points: { pointsPerCurrencyUnit: 1, rewardThresholds: [] },
          },
        })
        .expect(201);
      expect(points.body.type).toBe('points');

      // Clean up
      await databaseService.getPool().query(
        'DELETE FROM public.program_configurations WHERE program_id = $1',
        [points.body.id],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.programs WHERE id = $1',
        [points.body.id],
      );

      // Test both
      const both = await http
        .post('/programs')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'both',
          configurations: {
            stamps: { purchasesPerStamp: 5, rewardThresholds: [] },
            points: { pointsPerCurrencyUnit: 1, rewardThresholds: [] },
          },
        })
        .expect(201);
      expect(both.body.type).toBe('both');
      expect(both.body.configurations).toHaveLength(2);
    });
  });

  describe('Version auto-increment and lifecycle', () => {
    it('auto-increments programme version', async () => {
      const http = request(app.getHttpServer());

      // Clean up
      await databaseService.getPool().query(
        `DELETE FROM public.program_configurations
         WHERE program_id IN (
           SELECT id FROM public.programs WHERE business_id = $1
         )`,
        [businessId],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.programs WHERE business_id = $1',
        [businessId],
      );

      // Create v1
      const v1 = await http
        .post('/programs')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'stamps',
          configurations: {
            stamps: { purchasesPerStamp: 10, rewardThresholds: [] },
          },
        })
        .expect(201);
      expect(v1.body.version).toBe(1);

      // Create v2 (new version)
      const v2 = await http
        .post('/programs/versions')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'points',
          configurations: {
            points: { pointsPerCurrencyUnit: 1, rewardThresholds: [] },
          },
        })
        .expect(201);
      expect(v2.body.version).toBe(2);

      // Create v3
      const v3 = await http
        .post('/programs/versions')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'both',
          configurations: {
            stamps: { purchasesPerStamp: 5, rewardThresholds: [] },
            points: { pointsPerCurrencyUnit: 2, rewardThresholds: [] },
          },
        })
        .expect(201);
      expect(v3.body.version).toBe(3);
    });

    it('deactivates previous version when creating new version', async () => {
      const http = request(app.getHttpServer());

      // Clean up
      await databaseService.getPool().query(
        `DELETE FROM public.program_configurations
         WHERE program_id IN (
           SELECT id FROM public.programs WHERE business_id = $1
         )`,
        [businessId],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.programs WHERE business_id = $1',
        [businessId],
      );

      // Create v1
      const v1 = await http
        .post('/programs')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'stamps',
          configurations: {
            stamps: { purchasesPerStamp: 10, rewardThresholds: [] },
          },
        })
        .expect(201);

      // Create v2
      const v2 = await http
        .post('/programs/versions')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'points',
          configurations: {
            points: { pointsPerCurrencyUnit: 1, rewardThresholds: [] },
          },
        })
        .expect(201);

      // Check that v1 is now inactive
      const v1Check = await http
        .get(`/programs/${v1.body.id}`)
        .set('Cookie', merchant.cookie)
        .expect(200);
      expect(v1Check.body.status).toBe('inactive');
      expect(v1Check.body.deactivatedAt).toBeTruthy();

      // Check that v2 is active
      const v2Check = await http
        .get(`/programs/${v2.body.id}`)
        .set('Cookie', merchant.cookie)
        .expect(200);
      expect(v2Check.body.status).toBe('active');
    });

    it('maintains only one active programme per business', async () => {
      const http = request(app.getHttpServer());

      // Clean up
      await databaseService.getPool().query(
        `DELETE FROM public.program_configurations
         WHERE program_id IN (
           SELECT id FROM public.programs WHERE business_id = $1
         )`,
        [businessId],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.programs WHERE business_id = $1',
        [businessId],
      );

      // Create v1
      await http
        .post('/programs')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'stamps',
          configurations: {
            stamps: { purchasesPerStamp: 10, rewardThresholds: [] },
          },
        })
        .expect(201);

      // Create v2
      await http
        .post('/programs/versions')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'points',
          configurations: {
            points: { pointsPerCurrencyUnit: 1, rewardThresholds: [] },
          },
        })
        .expect(201);

      // Create v3
      await http
        .post('/programs/versions')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'both',
          configurations: {
            stamps: { purchasesPerStamp: 5, rewardThresholds: [] },
            points: { pointsPerCurrencyUnit: 2, rewardThresholds: [] },
          },
        })
        .expect(201);

      // Check current programme - should be v3
      const current = await http
        .get('/programs/current')
        .set('Cookie', merchant.cookie)
        .expect(200);
      expect(current.body.version).toBe(3);
      expect(current.body.status).toBe('active');

      // List all programmes
      const all = await http
        .get('/programs')
        .set('Cookie', merchant.cookie)
        .expect(200);

      // Count active programmes
      const activeCount = all.body.programs.filter(
        (p: { status: string }) => p.status === 'active',
      ).length;
      expect(activeCount).toBe(1);
    });
  });

  describe('Programme deletion with integrity checks', () => {
    it('allows deletion of inactive programme without dependencies', async () => {
      const http = request(app.getHttpServer());

      // Clean up
      await databaseService.getPool().query(
        `DELETE FROM public.program_configurations
         WHERE program_id IN (
           SELECT id FROM public.programs WHERE business_id = $1
         )`,
        [businessId],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.programs WHERE business_id = $1',
        [businessId],
      );

      // Create and deactivate a programme
      const v1 = await http
        .post('/programs')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'stamps',
          configurations: {
            stamps: { purchasesPerStamp: 10, rewardThresholds: [] },
          },
        })
        .expect(201);

      // Deactivate it
      await http
        .patch(`/programs/${v1.body.id}/deactivate`)
        .set('Cookie', merchant.cookie)
        .expect(200);

      // Create a new active programme
      const v2 = await http
        .post('/programs/versions')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'points',
          configurations: {
            points: { pointsPerCurrencyUnit: 1, rewardThresholds: [] },
          },
        })
        .expect(201);

      // Delete the inactive programme (v1)
      const result = await http
        .delete(`/programs/${v1.body.id}`)
        .set('Cookie', merchant.cookie)
        .expect(200);

      expect(result.body.success).toBe(true);

      // Verify it's gone
      await http
        .get(`/programs/${v1.body.id}`)
        .set('Cookie', merchant.cookie)
        .expect(404);
    });

    it('rejects deletion of active programme', async () => {
      const http = request(app.getHttpServer());

      // Clean up
      await databaseService.getPool().query(
        `DELETE FROM public.program_configurations
         WHERE program_id IN (
           SELECT id FROM public.programs WHERE business_id = $1
         )`,
        [businessId],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.programs WHERE business_id = $1',
        [businessId],
      );

      // Create an active programme
      const active = await http
        .post('/programs')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'stamps',
          configurations: {
            stamps: { purchasesPerStamp: 10, rewardThresholds: [] },
          },
        })
        .expect(201);

      // Try to delete it - should fail
      await http
        .delete(`/programs/${active.body.id}`)
        .set('Cookie', merchant.cookie)
        .expect(404); // NotFoundException because it's active
    });

    it('rejects deletion of programme with loyalty activity', async () => {
      const http = request(app.getHttpServer());

      // Clean up
      await databaseService.getPool().query(
        `DELETE FROM public.loyalty_activity_entries
         WHERE transaction_id IN (
           SELECT id FROM public.loyalty_transactions WHERE business_id = $1
         )`,
        [businessId],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.loyalty_transactions WHERE business_id = $1',
        [businessId],
      );
      await databaseService.getPool().query(
        `DELETE FROM public.program_configurations
         WHERE program_id IN (
           SELECT id FROM public.programs WHERE business_id = $1
         )`,
        [businessId],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.programs WHERE business_id = $1',
        [businessId],
      );

      // Create a programme
      const program = await http
        .post('/programs')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'stamps',
          configurations: {
            stamps: { purchasesPerStamp: 10, rewardThresholds: [] },
          },
        })
        .expect(201);

      // Get programme configuration ID
      const configs = await databaseService.getPool().query<{ id: string; program_id: string }>(
        'SELECT id, program_id FROM public.program_configurations WHERE program_id = $1',
        [program.body.id],
      );
      const configId = configs.rows[0].id;

      // Create a customer and membership
      const customerAccountId = randomUUID();
      const membershipId = randomUUID();
      const transactionId = randomUUID();

      await databaseService.getPool().query(
        `INSERT INTO public.customer_accounts (id, user_id, phone_number, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [customerAccountId, randomUUID(), '+21612345678'],
      );

      await databaseService.getPool().query(
        `INSERT INTO public.customer_business_memberships (id, customer_account_id, business_id, status, joined_at, created_at)
         VALUES ($1, $2, $3, 'active', NOW(), NOW())`,
        [membershipId, customerAccountId, businessId],
      );

      // Get a merchant account for the business
      const merchantAccount = await databaseService.getPool().query<{ id: string }>(
        `SELECT ma.id FROM public.merchant_accounts ma
         JOIN public.businesses b ON b.merchant_id = ma.id
         WHERE b.id = $1`,
        [businessId],
      );

      await databaseService.getPool().query(
        `INSERT INTO public.loyalty_transactions 
         (id, business_id, membership_id, branch_id, merchant_account_id, category, occurred_at, idempotency_key, request_fingerprint, created_at)
         VALUES ($1, $2, $3, $4, $5, 'purchase', NOW(), $6, $7, NOW())`,
        [
          transactionId,
          businessId,
          membershipId,
          firstBranchId,
          merchantAccount.rows[0].id,
          randomUUID(),
          'a'.repeat(64),
        ],
      );

      // Create loyalty activity entry linked to this programme configuration
      await databaseService.getPool().query(
        `INSERT INTO public.loyalty_activity_entries 
         (id, transaction_id, activity_type, delta, program_configuration_id, created_at)
         VALUES ($1, $2, 'stamps', 1, $3, NOW())`,
        [randomUUID(), transactionId, configId],
      );

      // Deactivate the programme
      await http
        .patch(`/programs/${program.body.id}/deactivate`)
        .set('Cookie', merchant.cookie)
        .expect(200);

      // Try to delete the programme - should fail due to loyalty activity
      const result = await http
        .delete(`/programs/${program.body.id}`)
        .set('Cookie', merchant.cookie)
        .expect(400);

      expect(result.body.message).toContain('historical loyalty activity');
      expect(result.body.message).toContain('Programmes with transactions must be preserved');

      // Verify programme still exists
      await http
        .get(`/programs/${program.body.id}`)
        .set('Cookie', merchant.cookie)
        .expect(200);
    });

    it('rejects deletion of non-existent programme', async () => {
      const http = request(app.getHttpServer());
      await http
        .delete('/programs/non-existent-id')
        .set('Cookie', merchant.cookie)
        .expect(404);
    });

    it('rejects unauthenticated programme deletion', async () => {
      const http = request(app.getHttpServer());
      await http
        .delete('/programs/some-id')
        .expect(401);
    });
  });

  describe('Enhanced programme creation', () => {
    it('creates programme with enhanced configuration DTO', async () => {
      const http = request(app.getHttpServer());

      // Clean up
      await databaseService.getPool().query(
        `DELETE FROM public.program_configurations
         WHERE program_id IN (
           SELECT id FROM public.programs WHERE business_id = $1
         )`,
        [businessId],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.programs WHERE business_id = $1',
        [businessId],
      );

      const response = await http
        .post('/programs/enhanced')
        .set('Cookie', merchant.cookie)
        .send({
          name: 'Enhanced Programme',
          description: 'A test programme',
          type: 'stamps',
          stamps: {
            earningRule: {
              purchasesPerStamp: 10,
              description: 'Buy 10, get 1 stamp',
            },
            rewardThresholds: [
              { stampsRequired: 10, name: 'Free Coffee', description: 'Get a free coffee', isActive: true },
            ],
            stampExpirationDays: 30,
          },
        })
        .expect(201);

      expect(response.body.name).toBe('Enhanced Programme');
      expect(response.body.description).toBe('A test programme');
      expect(response.body.type).toBe('stamps');
      expect(response.body.version).toBe(1);
      expect(response.body.status).toBe('active');
    });

    it('creates combined programme with enhanced configuration', async () => {
      const http = request(app.getHttpServer());

      // Clean up
      await databaseService.getPool().query(
        `DELETE FROM public.program_configurations
         WHERE program_id IN (
           SELECT id FROM public.programs WHERE business_id = $1
         )`,
        [businessId],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.programs WHERE business_id = $1',
        [businessId],
      );

      const response = await http
        .post('/programs/enhanced')
        .set('Cookie', merchant.cookie)
        .send({
          name: 'Combined Programme',
          type: 'both',
          stamps: {
            earningRule: { purchasesPerStamp: 5, description: '5 purchases = 1 stamp' },
            rewardThresholds: [
              { stampsRequired: 10, name: 'Free Item', isActive: true },
            ],
          },
          points: {
            earningRule: { pointsPerCurrencyUnit: 1, currencyCode: 'TND', description: '1 TND = 1 point' },
            rewardThresholds: [
              { pointsRequired: 100, name: 'Discount', isActive: true },
            ],
          },
        })
        .expect(201);

      expect(response.body.name).toBe('Combined Programme');
      expect(response.body.type).toBe('both');
      expect(response.body.configurations.stamps).toBeTruthy();
      expect(response.body.configurations.points).toBeTruthy();
    });
  });

  describe('Programme metadata updates', () => {
    it('updates programme name and description', async () => {
      const http = request(app.getHttpServer());

      // Clean up
      await databaseService.getPool().query(
        `DELETE FROM public.program_configurations
         WHERE program_id IN (
           SELECT id FROM public.programs WHERE business_id = $1
         )`,
        [businessId],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.programs WHERE business_id = $1',
        [businessId],
      );

      // Create programme
      const program = await http
        .post('/programs')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'stamps',
          configurations: {
            stamps: { purchasesPerStamp: 10, rewardThresholds: [] },
          },
        })
        .expect(201);

      // Update metadata
      const updated = await http
        .patch(`/programs/${program.body.id}`)
        .set('Cookie', merchant.cookie)
        .send({ name: 'Updated Programme', description: 'Updated description' })
        .expect(200);

      expect(updated.body.name).toBe('Updated Programme');
      expect(updated.body.description).toBe('Updated description');
    });

    it('updates only name when description omitted', async () => {
      const http = request(app.getHttpServer());

      // Clean up
      await databaseService.getPool().query(
        `DELETE FROM public.program_configurations
         WHERE program_id IN (
           SELECT id FROM public.programs WHERE business_id = $1
         )`,
        [businessId],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.programs WHERE business_id = $1',
        [businessId],
      );

      // Create programme
      const program = await http
        .post('/programs')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'stamps',
          configurations: {
            stamps: { purchasesPerStamp: 10, rewardThresholds: [] },
          },
        })
        .expect(201);

      // Update only name
      const updated = await http
        .patch(`/programs/${program.body.id}`)
        .set('Cookie', merchant.cookie)
        .send({ name: 'Name Only Update' })
        .expect(200);

      expect(updated.body.name).toBe('Name Only Update');
      expect(updated.body.description).toBeNull();
    });
  });

  describe('Programme history preservation', () => {
    it('preserves historical programmes when creating new versions', async () => {
      const http = request(app.getHttpServer());

      // Clean up
      await databaseService.getPool().query(
        `DELETE FROM public.program_configurations
         WHERE program_id IN (
           SELECT id FROM public.programs WHERE business_id = $1
         )`,
        [businessId],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.programs WHERE business_id = $1',
        [businessId],
      );

      // Create v1
      const v1 = await http
        .post('/programs')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'stamps',
          configurations: {
            stamps: { purchasesPerStamp: 10, rewardThresholds: [] },
          },
        })
        .expect(201);

      // Create v2
      const v2 = await http
        .post('/programs/versions')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'points',
          configurations: {
            points: { pointsPerCurrencyUnit: 1, rewardThresholds: [] },
          },
        })
        .expect(201);

      // Create v3
      const v3 = await http
        .post('/programs/versions')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'both',
          configurations: {
            stamps: { purchasesPerStamp: 5, rewardThresholds: [] },
            points: { pointsPerCurrencyUnit: 2, rewardThresholds: [] },
          },
        })
        .expect(201);

      // Get history
      const history = await http
        .get('/programs/history')
        .set('Cookie', merchant.cookie)
        .expect(200);

      expect(history.body).toHaveLength(3);
      expect(history.body.map((p: { version: number }) => p.version)).toEqual([3, 2, 1]);

      // Verify v1 and v2 are still in the database (inactive)
      const allPrograms = await http
        .get('/programs')
        .set('Cookie', merchant.cookie)
        .expect(200);

      expect(allPrograms.body.programs).toHaveLength(3);
      const inactivePrograms = allPrograms.body.programs.filter(
        (p: { status: string }) => p.status === 'inactive',
      );
      expect(inactivePrograms).toHaveLength(2);
    });

    it('returns programmes ordered by version descending', async () => {
      const http = request(app.getHttpServer());

      // Clean up and create multiple versions
      await databaseService.getPool().query(
        `DELETE FROM public.program_configurations
         WHERE program_id IN (
           SELECT id FROM public.programs WHERE business_id = $1
         )`,
        [businessId],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.programs WHERE business_id = $1',
        [businessId],
      );

      const v1 = await http
        .post('/programs')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'stamps',
          configurations: {
            stamps: { purchasesPerStamp: 10, rewardThresholds: [] },
          },
        })
        .expect(201);

      const v2 = await http
        .post('/programs/versions')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'points',
          configurations: {
            points: { pointsPerCurrencyUnit: 1, rewardThresholds: [] },
          },
        })
        .expect(201);

      const v3 = await http
        .post('/programs/versions')
        .set('Cookie', merchant.cookie)
        .send({
          type: 'both',
          configurations: {
            stamps: { purchasesPerStamp: 5, rewardThresholds: [] },
            points: { pointsPerCurrencyUnit: 2, rewardThresholds: [] },
          },
        })
        .expect(201);

      const history = await http
        .get('/programs/history')
        .set('Cookie', merchant.cookie)
        .expect(200);

      expect(history.body[0].version).toBe(3);
      expect(history.body[1].version).toBe(2);
      expect(history.body[2].version).toBe(1);
    });
  });

  async function registerMerchant(email: string): Promise<TestMerchant> {
    const response = await request(app.getHttpServer())
      .post('/auth/sign-up/email')
      .send({
        email,
        password: `Test-${randomUUID()}-Password!`,
        name: 'Synthetic Programme Lifecycle Merchant',
      })
      .expect(200);
    const cookie = response.headers['set-cookie'];
    if (!cookie?.length) {
      throw new Error('Merchant registration did not establish a session cookie.');
    }
    return { userId: response.body.user.id, cookie };
  }
});
