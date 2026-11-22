import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

/**
 * Checkpoint 6B-C merchant earning, redemption, reversal and history over HTTP
 * against a running PostgreSQL with migrations 0012-0014 applied.
 *
 * Opt-in: RUN_MERCHANT_TRANSACTION_INTEGRATION=true.
 * The local database role bypasses RLS, so this spec does not prove tenant
 * isolation; it verifies the application-level business scoping only.
 * Ledger rows are append-only and are intentionally left in place (unique
 * random merchant e-mails and phone numbers keep runs independent).
 */
const enabled = process.env.RUN_MERCHANT_TRANSACTION_INTEGRATION === 'true';
const integrationDescribe = enabled ? describe : describe.skip;

integrationDescribe('Merchant transactions (Checkpoint 6B-C, PostgreSQL)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let merchantCookie: string[];
  let otherMerchantCookie: string[];
  let membershipId: string;
  let stampConfigId: string;
  let qrCredential: string;

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api'); // as in main.ts; Better Auth basePath is /api/auth
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    database = moduleFixture.get<DatabaseService>(DatabaseService);

    merchantCookie = await registerMerchant();
    otherMerchantCookie = await registerMerchant();

    const business = await http()
      .post('/api/merchants/business-setup/business')
      .set('Cookie', merchantCookie)
      .send({ name: '6B-C Integration Business' })
      .expect(201);
    await http()
      .post('/api/merchants/business-setup/first-branch')
      .set('Cookie', merchantCookie)
      .send({ name: '6B-C Branch', address: '1 Rue Test' })
      .expect(201);
    await http()
      .post('/api/merchants/business-setup/business')
      .set('Cookie', otherMerchantCookie)
      .send({ name: '6B-C Other Business' })
      .expect(201);

    const program = await http()
      .post('/api/programs/enhanced')
      .set('Cookie', merchantCookie)
      .send({
        type: 'both',
        stamps: {
          earningRule: {},
          rewardThresholds: [{ stampsRequired: 2, name: 'Free coffee', isActive: true }],
        },
        points: {
          earningRule: { pointsPerCurrencyUnit: 2.5, currencyCode: 'TND' },
          rewardThresholds: [{ pointsRequired: 50, name: 'Discount', isActive: true }],
        },
      })
      .expect(201);
    const configs = await database.getPool().query<{ id: string; type: string }>(
      'SELECT id, type FROM program_configurations WHERE program_id = $1',
      [program.body.id],
    );
    stampConfigId = configs.rows.find((c) => c.type === 'stamps')!.id;

    const phoneNumber = `+21629${`${Date.now()}`.slice(-6)}`;
    const signIn = await http()
      .post('/api/auth/phone/sign-in')
      .set('X-Forwarded-For', `10.0.${Math.floor(Math.random() * 250)}.1`)
      .send({ phoneNumber })
      .expect((res) => {
        // The handler currently answers 201 (Nest POST default); older docs and specs say 200.
        if (![200, 201].includes(res.status)) throw new Error(`phone sign-in returned ${res.status}`);
      });
    const customerCookie = signIn.headers['set-cookie'] as unknown as string[];
    const joined = await http()
      .post('/api/customers/memberships')
      .set('Cookie', customerCookie)
      .send({ businessQrId: business.body.business.publicQrId })
      .expect(201);
    membershipId = joined.body.id;
    const qr = await http()
      .post('/api/customers/personal-qr')
      .set('Cookie', customerCookie)
      .expect(201);
    qrCredential = qr.body.credential;
  });

  afterAll(async () => {
    await app?.close();
  });

  async function registerMerchant(): Promise<string[]> {
    const response = await http()
      .post('/api/auth/sign-up/email')
      .send({
        email: `6bc-merchant-${randomUUID()}@example.test`,
        password: `Test-${randomUUID()}-Password!`,
        name: '6B-C Merchant',
      })
      .expect(200);
    return response.headers['set-cookie'] as unknown as string[];
  }

  const earn = (body: Record<string, unknown>) =>
    http()
      .post('/api/merchants/transactions')
      .set('Cookie', merchantCookie)
      .send({ membershipId, idempotencyKey: randomUUID(), ...body });

  it('earns one stamp and floor(points), storing millimes and the rate snapshot', async () => {
    const response = await earn({ purchaseAmount: '12.500' }).expect(201);
    expect(response.body).toMatchObject({
      purchaseAmount: '12.500',
      stampsEarned: 1,
      pointsEarned: 31,
      earningRate: '2.50',
      newBalance: { stamps: 1, points: 31 },
    });

    const stored = await database.getPool().query(
      `SELECT t.purchase_amount_millimes, e.activity_type, e.earning_rate_hundredths
       FROM loyalty_transactions t JOIN loyalty_activity_entries e ON e.transaction_id = t.id
       WHERE t.id = $1 ORDER BY e.activity_type`,
      [response.body.transactionId],
    );
    expect(stored.rows.map((r) => [String(r.purchase_amount_millimes), r.activity_type, r.earning_rate_hundredths]))
      .toEqual(expect.arrayContaining([
        ['12500', 'points', 250],
        ['12500', 'stamps', null],
      ]));
  });

  it('rejects a numeric or over-precise amount and requires one for points', async () => {
    await earn({ purchaseAmount: 12.5 }).expect(400);
    await earn({ purchaseAmount: '1.0001' }).expect(400);
    await earn({ confirmRepeat: true }).expect(400);
  });

  it('warns about a repeat earning within 10 minutes until confirmed', async () => {
    const warning = await earn({ purchaseAmount: '4.000' }).expect(409);
    expect(warning.body.code).toBe('RECENT_EARNING_CONFIRMATION_REQUIRED');
    await earn({ purchaseAmount: '4.000', confirmRepeat: true }).expect(201);
  });

  it('redeems a stamp reward, preserving the surplus, and reverses it with a reason', async () => {
    const resolved = await http()
      .post('/api/merchants/customers/resolve-for-transaction')
      .set('Cookie', merchantCookie)
      .send({ qrCredential })
      .expect(201);
    const stampsBefore = resolved.body.balance.stamps;
    expect(resolved.body.rewards).toEqual(
      expect.arrayContaining([expect.objectContaining({ configurationId: stampConfigId, rewardIndex: 0, cost: 2 })]),
    );

    const redemption = await http()
      .post('/api/merchants/transactions/redeem-reward')
      .set('Cookie', merchantCookie)
      .send({ membershipId, configurationId: stampConfigId, rewardIndex: 0, idempotencyKey: randomUUID() })
      .expect(201);
    expect(redemption.body.newBalance.stamps).toBe(stampsBefore - 2);

    const reversalKey = randomUUID();
    const reversal = await http()
      .post(`/api/merchants/transactions/${redemption.body.transactionId}/reverse`)
      .set('Cookie', merchantCookie)
      .send({ reason: 'Reward not handed over', idempotencyKey: reversalKey })
      .expect(201);
    expect(reversal.body.newBalance.stamps).toBe(stampsBefore);

    const retry = await http()
      .post(`/api/merchants/transactions/${redemption.body.transactionId}/reverse`)
      .set('Cookie', merchantCookie)
      .send({ reason: 'Reward not handed over', idempotencyKey: reversalKey })
      .expect(201);
    expect(retry.body.transactionId).toBe(reversal.body.transactionId);

    await http()
      .post(`/api/merchants/transactions/${redemption.body.transactionId}/reverse`)
      .set('Cookie', merchantCookie)
      .send({ reason: 'Again', idempotencyKey: randomUUID() })
      .expect(409);
    await http()
      .post(`/api/merchants/transactions/${reversal.body.transactionId}/reverse`)
      .set('Cookie', merchantCookie)
      .send({ reason: 'Undo', idempotencyKey: randomUUID() })
      .expect(400);
  });

  it('hides transactions of another business', async () => {
    const history = await http()
      .get(`/api/merchants/transactions?membershipId=${membershipId}`)
      .set('Cookie', merchantCookie)
      .expect(200);
    expect(history.body.transactions.length).toBeGreaterThan(0);

    const otherHistory = await http()
      .get(`/api/merchants/transactions?membershipId=${membershipId}`)
      .set('Cookie', otherMerchantCookie)
      .expect(200);
    expect(otherHistory.body.transactions).toEqual([]);

    await http()
      .post(`/api/merchants/transactions/${history.body.transactions[0].id}/reverse`)
      .set('Cookie', otherMerchantCookie)
      .send({ reason: 'Not mine', idempotencyKey: randomUUID() })
      .expect(404);
  });

  it('rejects UPDATE of programme configurations at the database level', async () => {
    await expect(
      database.getPool().query(
        `UPDATE program_configurations SET settings = '{}'::jsonb WHERE id = $1`,
        [stampConfigId],
      ),
    ).rejects.toThrow(/immutable/i);
  });
});
