import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import sharp from 'sharp';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

const enabled = process.env.RUN_BUSINESS_SETUP_INTEGRATION === 'true';
const integrationDescribe = enabled ? describe : describe.skip;

interface TestMerchant {
  userId: string;
  cookie: string[];
}

integrationDescribe('Merchant business setup integration', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;
  let firstMerchant: TestMerchant;
  let secondMerchant: TestMerchant;
  let firstBusinessId: string;
  let firstBranchId: string;
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

    firstEmail = `business-setup-${randomUUID()}@example.test`;
    secondEmail = `business-setup-${randomUUID()}@example.test`;
    const existing = await databaseService.getPool().query(
      'SELECT id FROM public.users WHERE email = ANY($1::text[])',
      [[firstEmail, secondEmail]],
    );
    if (existing.rowCount) {
      throw new Error('Generated business-setup test identity already exists.');
    }

    firstMerchant = await registerMerchant(firstEmail);
    secondMerchant = await registerMerchant(secondEmail);
  });

  afterAll(async () => {
    if (databaseService && firstEmail && secondEmail) {
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

  it('rejects unauthenticated access and reports an uncreated business', async () => {
    const http = request(app.getHttpServer());

    await http.get('/merchants/business-setup').expect(401);
    await http
      .post('/merchants/business-setup/business')
      .send({ name: 'Unauthenticated Business' })
      .expect(401);

    const response = await http
      .get('/merchants/business-setup')
      .set('Cookie', firstMerchant.cookie)
      .expect(200);
    expect(response.body).toEqual({
      status: 'required',
      business: null,
      branches: [],
    });

    const profile = await http
      .get('/merchants/profile')
      .set('Cookie', firstMerchant.cookie)
      .expect(200);
    expect(profile.body.userId).toBe(firstMerchant.userId);
  });

  it('creates one business and returns it on retries', async () => {
    const http = request(app.getHttpServer());
    const first = await http
      .post('/merchants/business-setup/business')
      .set('Cookie', firstMerchant.cookie)
      .send({ name: 'Synthetic Test Business' })
      .expect(201);
    const retry = await http
      .post('/merchants/business-setup/business')
      .set('Cookie', firstMerchant.cookie)
      .send({ name: 'Ignored Retry Name' })
      .expect(201);

    firstBusinessId = first.body.business.id;
    expect(first.body.business.id).toBe(retry.body.business.id);
    expect(retry.body.business.name).toBe('Synthetic Test Business');
    expect(retry.body.status).toBe('in_progress');
    expect(retry.body.business.phonePubliclyDisplayed).toBe(false);
    expect(retry.body.business.phoneVisibilityConfigured).toBe(false);

    await http
      .post('/merchants/business-setup/business')
      .set('Cookie', firstMerchant.cookie)
      .send({
        name: 'Must Be Rejected',
        merchantId: secondMerchant.userId,
      })
      .expect(400);

    const dbCount = await databaseService.getPool().query<{ count: number }>(
      `SELECT count(*)::int AS count
       FROM public.businesses b
       JOIN public.merchant_accounts ma ON ma.id = b.merchant_id
       WHERE ma.user_id = $1`,
      [firstMerchant.userId],
    );
    expect(dbCount.rows[0].count).toBe(1);
  });

  it('creates one first branch, enforces completion, and supports incomplete updates', async () => {
    const http = request(app.getHttpServer());
    const incomplete = await http
      .post('/merchants/business-setup/complete')
      .set('Cookie', firstMerchant.cookie)
      .expect(400);
    expect(incomplete.body.missingFields).toContain('business.businessPhone');

    await http
      .patch('/merchants/business-setup/business')
      .set('Cookie', firstMerchant.cookie)
      .send({
        businessPhone: '+21670000000',
        logoUrl: 'https://example.test/logo.png',
        theme: { primaryColor: '#112233', accentColor: '#AABBCC' },
      })
      .expect(200);
    await http
      .patch('/merchants/business-setup/business')
      .set('Cookie', firstMerchant.cookie)
      .send({ theme: { primaryColor: 'blue', accentColor: '#AABBCC' } })
      .expect(400);

    const firstBranch = await http
      .post('/merchants/business-setup/first-branch')
      .set('Cookie', firstMerchant.cookie)
      .send({ name: 'Synthetic Main Branch', address: '1 Test Street' })
      .expect(201);
    firstBranchId = firstBranch.body.branches[0].id;
    const retry = await http
      .post('/merchants/business-setup/first-branch')
      .set('Cookie', firstMerchant.cookie)
      .send({ name: 'Ignored Retry Branch', address: '2 Other Street' })
      .expect(201);
    expect(firstBranch.body.branches).toHaveLength(1);
    expect(retry.body.branches[0].id).toBe(firstBranch.body.branches[0].id);
    expect(retry.body.branches[0].name).toBe('Synthetic Main Branch');
    const retrieved = await http
      .get('/merchants/business-setup')
      .set('Cookie', firstMerchant.cookie)
      .expect(200);
    expect(retrieved.body.business.id).toBe(firstBusinessId);
    expect(retrieved.body.branches[0].id).toBe(firstBranchId);

    const branchCount = await databaseService.getPool().query<{ count: number }>(
      'SELECT count(*)::int AS count FROM public.branches WHERE business_id = $1',
      [firstBranch.body.business.id],
    );
    expect(branchCount.rows[0].count).toBe(1);

    const missingChoice = await http
      .post('/merchants/business-setup/complete')
      .set('Cookie', firstMerchant.cookie)
      .expect(400);
    expect(missingChoice.body.missingFields).toEqual([
      'business.phonePubliclyDisplayed',
    ]);

    const complete = await http
      .patch('/merchants/business-setup/business')
      .set('Cookie', firstMerchant.cookie)
      .send({ phonePubliclyDisplayed: false })
      .expect(200);
    expect(complete.body.business.phoneVisibilityConfigured).toBe(true);
    await http
      .patch('/merchants/business-setup/first-branch')
      .set('Cookie', firstMerchant.cookie)
      .send({ address: '2 Updated Test Street' })
      .expect(200);

    const completed = await http
      .post('/merchants/business-setup/complete')
      .set('Cookie', firstMerchant.cookie)
      .expect(201);
    expect(completed.body.status).toBe('complete');
    expect(completed.body.business.onboardingCompleted).toBe(true);

    const afterRemoval = await http
      .patch('/merchants/business-setup/business')
      .set('Cookie', firstMerchant.cookie)
      .send({ logoUrl: null })
      .expect(200);
    expect(afterRemoval.body.status).toBe('in_progress');
    expect(afterRemoval.body.business.onboardingCompleted).toBe(false);
  });

  it('does not expose or modify another merchant setup', async () => {
    const http = request(app.getHttpServer());
    const secondStatus = await http
      .get('/merchants/business-setup')
      .set('Cookie', secondMerchant.cookie)
      .expect(200);
    expect(secondStatus.body).toEqual({
      status: 'required',
      business: null,
      branches: [],
    });

    await http
      .patch('/merchants/business-setup/business')
      .set('Cookie', secondMerchant.cookie)
      .send({ name: 'Unauthorized Update' })
      .expect(404);
    await http
      .get(`/merchants/business-setup/business/${firstBusinessId}`)
      .set('Cookie', secondMerchant.cookie)
      .expect(404);
    await http
      .patch(`/merchants/business-setup/business/${firstBusinessId}`)
      .set('Cookie', secondMerchant.cookie)
      .send({ name: 'Unauthorized Update' })
      .expect(404);
    await http
      .patch(`/merchants/business-setup/first-branch/${firstBranchId}`)
      .set('Cookie', secondMerchant.cookie)
      .send({ name: 'Unauthorized Update' })
      .expect(404);
  });

  async function registerMerchant(email: string): Promise<TestMerchant> {
    const response = await request(app.getHttpServer())
      .post('/auth/sign-up/email')
      .send({
        email,
        password: `Test-${randomUUID()}-Password!`,
        name: 'Synthetic Setup Merchant',
      })
      .expect(200);
    const cookie = response.headers['set-cookie'];
    if (!cookie?.length) {
      throw new Error('Merchant registration did not establish a session cookie.');
    }
    return {
      userId: response.body.user.id,
      cookie,
    };
  }

  describe('Onboarding logo validation (URL and device-based)', () => {
    let merchant: TestMerchant;
    let merchantEmail: string;

    beforeEach(async () => {
      merchantEmail = `logo-validation-${randomUUID()}@example.test`;
      const response = await request(app.getHttpServer())
        .post('/auth/sign-up/email')
        .send({
          email: merchantEmail,
          password: `Test-${randomUUID()}-Password!`,
          name: 'Logo Test Merchant',
        })
        .expect(200);
      
      merchant = {
        userId: response.body.user.id,
        cookie: response.headers['set-cookie'] || [],
      };

      // Create business
      await request(app.getHttpServer())
        .post('/merchants/business-setup/business')
        .set('Cookie', merchant.cookie)
        .send({ name: 'Logo Test Business' })
        .expect(201);

      // Create branch
      await request(app.getHttpServer())
        .post('/merchants/business-setup/first-branch')
        .set('Cookie', merchant.cookie)
        .send({ name: 'Main Branch', address: 'Test Address' })
        .expect(201);

      // Set phone and colors
      await request(app.getHttpServer())
        .patch('/merchants/business-setup/business')
        .set('Cookie', merchant.cookie)
        .send({
          businessPhone: '+21670000000',
          phonePubliclyDisplayed: true,
          theme: { primaryColor: '#123456', accentColor: '#ABCDEF' },
        })
        .expect(200);
    });

    afterEach(async () => {
      if (databaseService && merchantEmail) {
        await databaseService
          .getPool()
          .query('DELETE FROM public.users WHERE email = $1', [merchantEmail]);
      }
    });

    it('should reject completion without any logo', async () => {
      const response = await request(app.getHttpServer())
        .post('/merchants/business-setup/complete')
        .set('Cookie', merchant.cookie)
        .expect(400);

      expect(response.body.missingFields).toContain('business.logo');
    });

    it('should accept completion with valid URL-based logo', async () => {
      // Set URL logo
      await request(app.getHttpServer())
        .patch('/merchants/business-setup/business')
        .set('Cookie', merchant.cookie)
        .send({ logoUrl: 'https://example.com/logo.png' })
        .expect(200);

      // Should complete successfully
      const response = await request(app.getHttpServer())
        .post('/merchants/business-setup/complete')
        .set('Cookie', merchant.cookie)
        .expect(201);

      expect(response.body.business.onboardingCompleted).toBe(true);
    });

    it('should accept completion with valid device-based logo', async () => {
      const pngBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer();

      // Upload device-based logo
      await request(app.getHttpServer())
        .post('/merchants/business-setup/business/logo')
        .set('Cookie', merchant.cookie)
        .attach('file', pngBuffer, 'logo.png')
        .expect(201);

      // Should complete successfully without URL logo
      const response = await request(app.getHttpServer())
        .post('/merchants/business-setup/complete')
        .set('Cookie', merchant.cookie)
        .expect(201);

      expect(response.body.business.onboardingCompleted).toBe(true);
    });

    it('should handle businesses with both URL and device-based logos', async () => {
      const pngBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 0, g: 0, b: 255 },
        },
      })
        .png()
        .toBuffer();

      // Set URL logo
      await request(app.getHttpServer())
        .patch('/merchants/business-setup/business')
        .set('Cookie', merchant.cookie)
        .send({ logoUrl: 'https://example.com/logo.png' })
        .expect(200);

      // Upload device logo
      await request(app.getHttpServer())
        .post('/merchants/business-setup/business/logo')
        .set('Cookie', merchant.cookie)
        .attach('file', pngBuffer, 'logo.png')
        .expect(201);

      // Should complete successfully
      const response = await request(app.getHttpServer())
        .post('/merchants/business-setup/complete')
        .set('Cookie', merchant.cookie)
        .expect(201);

      expect(response.body.business.onboardingCompleted).toBe(true);
    });

    it('should revert to incomplete if URL logo is removed', async () => {
      // Set URL logo and complete
      await request(app.getHttpServer())
        .patch('/merchants/business-setup/business')
        .set('Cookie', merchant.cookie)
        .send({ logoUrl: 'https://example.com/logo.png' })
        .expect(200);

      const complete = await request(app.getHttpServer())
        .post('/merchants/business-setup/complete')
        .set('Cookie', merchant.cookie)
        .expect(201);

      expect(complete.body.business.onboardingCompleted).toBe(true);

      // Remove URL logo
      await request(app.getHttpServer())
        .patch('/merchants/business-setup/business')
        .set('Cookie', merchant.cookie)
        .send({ logoUrl: null })
        .expect(200);

      // Should revert to incomplete
      const setup = await request(app.getHttpServer())
        .get('/merchants/business-setup')
        .set('Cookie', merchant.cookie)
        .expect(200);

      expect(setup.body.status).toBe('in_progress');
    });
  });
});
