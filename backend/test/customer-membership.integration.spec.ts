import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/features/auth/auth.service';
import { DatabaseService } from '../src/database/database.service';

const enabled = process.env.RUN_CUSTOMER_MEMBERSHIP_INTEGRATION === 'true';
const integrationDescribe = enabled ? describe : describe.skip;

interface TestCustomer {
  phoneNumber: string;
  cookie: string[];
}

interface TestMerchant {
  email: string;
  cookie: string[];
}

integrationDescribe('Customer membership integration (PostgreSQL)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let auth: AuthService;
  let customer: TestCustomer;
  let otherCustomer: TestCustomer;
  let merchant: TestMerchant;
  let otherMerchant: TestMerchant;
  let businessQrId: string;
  let branchQrId: string;
  let inactiveBusinessQrId: string;
  let inactiveBusinessBranchQrId: string;

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
    database = moduleFixture.get<DatabaseService>(DatabaseService);
    auth = moduleFixture.get<AuthService>(AuthService);

    customer = await registerCustomer(app, auth);
    otherCustomer = await registerCustomer(app, auth);
    merchant = await registerMerchant(app);
    otherMerchant = await registerMerchant(app);

    const http = request(app.getHttpServer());
    const business = await http
      .post('/merchants/business-setup/business')
      .set('Cookie', merchant.cookie)
      .send({ name: 'Membership Integration Business' })
      .expect(201);
    expect(business.body.business.publicQrId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    await http
      .post('/merchants/business-setup/first-branch')
      .set('Cookie', merchant.cookie)
      .send({
        name: 'Membership Integration Branch',
        address: '1 Membership Integration Street',
      })
      .expect(201);
    await http
      .post('/programs')
      .set('Cookie', merchant.cookie)
      .send({ type: 'both', configurations: { stamps: {}, points: {} } })
      .expect(201);

    const noProgramBusiness = await http
      .post('/merchants/business-setup/business')
      .set('Cookie', otherMerchant.cookie)
      .send({ name: 'Membership Integration No-Programme Business' })
      .expect(201);
    await http
      .post('/merchants/business-setup/first-branch')
      .set('Cookie', otherMerchant.cookie)
      .send({
        name: 'Membership Integration Other Branch',
        address: '2 Membership Integration Street',
      })
      .expect(201);

    const identifiers = await database.getPool().query<{
      businessQrId: string;
      branchQrId: string;
      inactiveBusinessQrId: string;
      inactiveBusinessBranchQrId: string;
    }>(
      `SELECT b.public_qr_id AS "businessQrId",
              br.qr_code_id AS "branchQrId",
              other.public_qr_id AS "inactiveBusinessQrId",
              other_branch.qr_code_id AS "inactiveBusinessBranchQrId"
       FROM public.businesses b
       JOIN public.branches br ON br.business_id = b.id
       JOIN public.businesses other ON other.id = $2
       JOIN public.branches other_branch ON other_branch.business_id = other.id
       WHERE b.id = $1
       LIMIT 1`,
      [business.body.business.id, noProgramBusiness.body.business.id],
    );
    businessQrId = identifiers.rows[0].businessQrId;
    branchQrId = identifiers.rows[0].branchQrId;
    inactiveBusinessQrId = identifiers.rows[0].inactiveBusinessQrId;
    inactiveBusinessBranchQrId =
      identifiers.rows[0].inactiveBusinessBranchQrId;
  });

  afterAll(async () => {
    if (database && customer && otherCustomer && merchant && otherMerchant) {
      const phones = [customer.phoneNumber, otherCustomer.phoneNumber];
      const emails = [merchant.email, otherMerchant.email];
      await database.getPool().query(
        `DELETE FROM public.membership_lifecycle_events
         WHERE membership_id IN (
           SELECT m.id
           FROM public.customer_business_memberships m
           JOIN public.customer_accounts ca ON ca.id = m.customer_account_id
           WHERE ca.phone_number = ANY($1::text[])
         )`,
        [phones],
      );
      await database.getPool().query(
        `DELETE FROM public.customer_business_memberships
         WHERE customer_account_id IN (
           SELECT id FROM public.customer_accounts
           WHERE phone_number = ANY($1::text[])
         )`,
        [phones],
      );
      await database.getPool().query(
        `DELETE FROM public.customer_qr_credentials
         WHERE customer_account_id IN (
           SELECT id FROM public.customer_accounts
           WHERE phone_number = ANY($1::text[])
         )`,
        [phones],
      );
      await database.getPool().query(
        `DELETE FROM public.program_configurations
         WHERE program_id IN (
           SELECT p.id FROM public.programs p
           JOIN public.businesses b ON b.id = p.business_id
           JOIN public.merchant_accounts ma ON ma.id = b.merchant_id
           WHERE ma.user_id IN (
             SELECT id FROM public.users WHERE email = ANY($1::text[])
           )
         )`,
        [emails],
      );
      await database.getPool().query(
        `DELETE FROM public.programs
         WHERE business_id IN (
           SELECT b.id FROM public.businesses b
           JOIN public.merchant_accounts ma ON ma.id = b.merchant_id
           WHERE ma.user_id IN (
             SELECT id FROM public.users WHERE email = ANY($1::text[])
           )
         )`,
        [emails],
      );
      await database.getPool().query(
        'DELETE FROM public.users WHERE email = ANY($1::text[]) OR phone_number = ANY($2::text[])',
        [emails, phones],
      );
    }
    await app?.close();
  });

  it('joins once at business level through a branch, leaves, and reactivates with history', async () => {
    const http = request(app.getHttpServer());
    await http
      .get(`/customers/branches/qr/${encodeURIComponent(branchQrId)}`)
      .set('Cookie', customer.cookie)
      .expect(200)
      .expect((response) =>
        expect(response.body.branch.name).toBe('Membership Integration Branch'),
      );

    const first = await http
      .post('/customers/memberships')
      .set('Cookie', customer.cookie)
      .send({ branchQrId })
      .expect(201);
    const retry = await http
      .post('/customers/memberships')
      .set('Cookie', customer.cookie)
      .send({ businessQrId, branchQrId })
      .expect(201);
    expect(retry.body.id).toBe(first.body.id);
    expect(first.body).not.toHaveProperty('credential');

    await http
      .post(`/customers/memberships/${first.body.id}/leave`)
      .set('Cookie', customer.cookie)
      .expect(201)
      .expect((response) => expect(response.body.status).toBe('inactive'));
    const rejoined = await http
      .post('/customers/memberships')
      .set('Cookie', customer.cookie)
      .send({ businessQrId })
      .expect(201);
    expect(rejoined.body.id).toBe(first.body.id);
    expect(rejoined.body.lifecycle.map((event: { type: string }) => event.type))
      .toEqual(['joined', 'left', 'joined']);

    const persisted = await database.getPool().query<{ count: number }>(
      `SELECT count(*)::int AS count
       FROM public.customer_business_memberships m
       JOIN public.customer_accounts ca ON ca.id = m.customer_account_id
       WHERE ca.phone_number = $1`,
      [customer.phoneNumber],
    );
    expect(persisted.rows[0].count).toBe(1);
  });

  it('enforces active-programme and branch ownership requirements', async () => {
    const http = request(app.getHttpServer());
    await http
      .post('/customers/memberships')
      .set('Cookie', customer.cookie)
      .send({ businessQrId: inactiveBusinessQrId })
      .expect(409);
    await http
      .post('/customers/memberships')
      .set('Cookie', customer.cookie)
      .send({ businessQrId, branchQrId: inactiveBusinessBranchQrId })
      .expect(404);
    await http
      .post('/customers/memberships')
      .set('Cookie', otherMerchant.cookie)
      .send({ businessQrId })
      .expect(403);
    await http
      .post('/customers/memberships')
      .send({ businessQrId })
      .expect(401);
  });

  it('lists only the authenticated customer memberships and rejects cross-customer reads', async () => {
    const http = request(app.getHttpServer());
    const ownMembership = await http
      .get('/customers/memberships')
      .set('Cookie', customer.cookie)
      .expect(200);
    const otherMemberships = await http
      .get('/customers/memberships')
      .set('Cookie', otherCustomer.cookie)
      .expect(200);
    expect(ownMembership.body.length).toBeGreaterThan(0);
    expect(otherMemberships.body).toEqual([]);
    await http
      .get(`/customers/memberships/${ownMembership.body[0].id}`)
      .set('Cookie', otherCustomer.cookie)
      .expect(404);
  });

  it('issues one opaque customer QR, rotates it, and verifies secure hash resolution', async () => {
    const http = request(app.getHttpServer());

    // 1. First issuance returns raw credential once
    const first = await http
      .post('/customers/personal-qr')
      .set('Cookie', customer.cookie)
      .expect(201);
    expect(first.body.credential).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.body.credential).not.toContain(customer.phoneNumber);

    const customerAccount = await database.getPool().query<{ id: string }>(
      `SELECT id FROM public.customer_accounts WHERE phone_number = $1`,
      [customer.phoneNumber],
    );
    expect(first.body.credential).not.toContain(customerAccount.rows[0].id);

    // 2. Repeated issuance while active returns 409 Conflict (secret returned only once)
    await http
      .post('/customers/personal-qr')
      .set('Cookie', customer.cookie)
      .expect(409);

    // 3. Stored value in database is hash, not raw secret
    const storedCred = await database.getPool().query<{ credential_hash: string }>(
      `SELECT credential_hash FROM public.customer_qr_credentials WHERE customer_account_id = $1 AND revoked_at IS NULL`,
      [customerAccount.rows[0].id],
    );
    expect(storedCred.rows[0].credential_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(storedCred.rows[0].credential_hash).not.toBe(first.body.credential);

    // 4. Customer must join business first to resolve QR
    await http
      .post('/customers/memberships')
      .set('Cookie', customer.cookie)
      .send({ businessQrId })
      .expect(201);

    // 5. Merchant resolves valid active customer QR
    const resolved = await http
      .post('/merchants/customers/resolve-qr')
      .set('Cookie', merchant.cookie)
      .send({ credential: first.body.credential })
      .expect(201);
    expect(resolved.body.membership.status).toBe('active');
    expect(resolved.body.credential).toBeUndefined();

    // 6. Rotate credential
    const rotated = await http
      .post('/customers/personal-qr/rotate')
      .set('Cookie', customer.cookie)
      .expect(201);
    expect(rotated.body.credential).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(rotated.body.credential).not.toBe(first.body.credential);

    // 7. Revoked old credential can no longer be resolved (404)
    await http
      .post('/merchants/customers/resolve-qr')
      .set('Cookie', merchant.cookie)
      .send({ credential: first.body.credential })
      .expect(404);

    // 8. New rotated credential resolves successfully
    const resolvedRotated = await http
      .post('/merchants/customers/resolve-qr')
      .set('Cookie', merchant.cookie)
      .send({ credential: rotated.body.credential })
      .expect(201);
    expect(resolvedRotated.body.membership.status).toBe('active');

    // 9. Ordinary retrieval returns metadata only, never the secret
    const retrieved = await http
      .get('/customers/personal-qr')
      .set('Cookie', customer.cookie)
      .expect(200);
    expect(retrieved.body.active).toBe(true);
    expect(retrieved.body.issuedAt).toBeDefined();
    expect(retrieved.body.credential).toBeUndefined();
    expect(retrieved.body.credentialHash).toBeUndefined();

    // 10. Memberships list does not expose credential secret
    const memberships = await http
      .get('/customers/memberships')
      .set('Cookie', customer.cookie)
      .expect(200);
    expect(JSON.stringify(memberships.body)).not.toContain(
      rotated.body.credential,
    );
  });
});

async function registerCustomer(
  app: INestApplication,
  auth: AuthService,
): Promise<TestCustomer> {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-11);
  const phoneNumber = `+216${suffix}`;
  const identifier = `phone-number-otp-${phoneNumber}`;
  const http = request(app.getHttpServer());
  await http.post('/auth/phone-number/send-otp').send({ phoneNumber }).expect(200);
  const code = (await auth.getBetterAuth().$context).test.getOTP(identifier);
  if (!code) throw new Error('Customer OTP was not created for integration test.');
  const verification = await http
    .post('/auth/phone-number/verify')
    .send({ phoneNumber, code })
    .expect(200);
  const cookie = verification.headers['set-cookie'];
  if (!cookie?.length) throw new Error('Customer OTP did not establish a session.');
  return { phoneNumber, cookie };
}

async function registerMerchant(app: INestApplication): Promise<TestMerchant> {
  const email = `customer-membership-${randomUUID()}@example.test`;
  const result = await request(app.getHttpServer())
    .post('/auth/sign-up/email')
    .send({
      email,
      password: `Test-${randomUUID()}-Password!`,
      name: 'Membership Integration Merchant',
    })
    .expect(200);
  const cookie = result.headers['set-cookie'];
  if (!cookie?.length) throw new Error('Merchant signup did not establish a session.');
  return { email, cookie };
}
