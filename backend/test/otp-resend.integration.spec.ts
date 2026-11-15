import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { eq, sql } from 'drizzle-orm';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/features/auth/auth.service';
import { DatabaseService } from '../src/database/database.service';
import { verifications } from '../src/features/auth/schemas';

const enabled = process.env.RUN_AUTH_INTEGRATION === 'true';
const integrationDescribe = enabled ? describe : describe.skip;

integrationDescribe('OTP resend integration (isolated test identity)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let dbService: DatabaseService;
  let phoneNumber: string;
  let identifier: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    authService = moduleFixture.get<AuthService>(AuthService);
    dbService = moduleFixture.get<DatabaseService>(DatabaseService);
  });

  beforeEach(async () => {
    const db = dbService.getDb();
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-11);
    phoneNumber = `+216${suffix}`;
    identifier = `phone-number-otp-${phoneNumber}`;
    const existing = await db.execute(sql`
      SELECT id FROM public.users WHERE phone_number = ${phoneNumber} LIMIT 1
    `);
    if (existing.rows.length) throw new Error('Generated OTP integration identity already exists.');
  });

  afterEach(async () => {
    if (!phoneNumber) return;
    const db = dbService.getDb();
    await db.execute(sql`
      DELETE FROM public.verifications WHERE identifier = ${identifier}
    `);
    await db.execute(sql`
      DELETE FROM public.customer_accounts WHERE phone_number = ${phoneNumber}
    `);
    await db.execute(sql`
      DELETE FROM public.users WHERE phone_number = ${phoneNumber}
    `);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('replaces resend codes, rejects stale/invalid/expired codes, and creates a session once', async () => {
    const http = request(app.getHttpServer());
    const firstResponse = await http
      .post('/auth/phone-number/send-otp')
      .send({ phoneNumber })
      .expect(200);
    expect(firstResponse.body.message).toBe('code sent');

    const auth = authService.getBetterAuth();
    const testHelpers = (await auth.$context).test;
    const firstCode = testHelpers.getOTP(identifier);
    expect(firstCode).toBeDefined();

    let latestCode = firstCode;
    for (let attempt = 0; latestCode === firstCode && attempt < 5; attempt += 1) {
      const resendResponse = await http
        .post('/auth/phone-number/send-otp')
        .send({ phoneNumber })
        .expect(200);
      expect(resendResponse.body.message).toBe('code sent');
      latestCode = testHelpers.getOTP(identifier);
    }
    expect(latestCode).toBeDefined();
    expect(latestCode).not.toBe(firstCode);

    if (firstCode !== latestCode) {
      await http
        .post('/auth/phone-number/verify')
        .send({ phoneNumber, code: firstCode })
        .expect((response) => expect(response.status).not.toBe(200));
    }

    await http
      .post('/auth/phone-number/verify')
      .send({ phoneNumber, code: latestCode === '000000' ? '000001' : '000000' })
      .expect((response) => expect(response.status).not.toBe(200));

    const verificationResponse = await http
      .post('/auth/phone-number/verify')
      .send({ phoneNumber, code: latestCode })
      .expect(200);
    const cookies = verificationResponse.headers['set-cookie'];
    expect(cookies).toBeDefined();

    const sessionResponse = await http
      .get('/auth/get-session')
      .set('Cookie', cookies)
      .expect(200)
      .expect((response) => expect(response.body.user.phoneNumber).toBe(phoneNumber));
    await http
      .get('/customers/profile')
      .set('Cookie', cookies)
      .expect(200)
      .expect((response) => expect(response.body.userId).toBe(sessionResponse.body.user.id));

    const db = dbService.getDb();
    await http
      .post('/auth/phone-number/send-otp')
      .send({ phoneNumber })
      .expect(200);
    const nextCode = testHelpers.getOTP(identifier);
    expect(nextCode).toBeDefined();
    await http
      .post('/auth/phone-number/verify')
      .send({ phoneNumber, code: nextCode })
      .expect(200);
    const customer = await db.execute(sql`
      SELECT count(*)::int AS count, bool_and(phone_verified) AS phone_verified
      FROM public.customer_accounts WHERE phone_number = ${phoneNumber}
    `);
    expect(customer.rows[0]).toEqual({ count: 1, phone_verified: true });

    await http
      .post('/auth/phone-number/send-otp')
      .send({ phoneNumber })
      .expect(200);
    await db
      .update(verifications)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(verifications.identifier, identifier));
    const expiredCode = testHelpers.getOTP(identifier);
    expect(expiredCode).toBeDefined();

    await http
      .post('/auth/phone-number/verify')
      .send({ phoneNumber, code: expiredCode })
      .expect((response) => expect(response.status).not.toBe(200));
  });
});
