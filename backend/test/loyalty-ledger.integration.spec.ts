import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/features/auth/auth.service';
import { DatabaseService } from '../src/database/database.service';
import { LoyaltyLedgerService } from '../src/features/loyalty/loyalty-ledger.service';

const enabled = process.env.RUN_LOYALTY_LEDGER_INTEGRATION === 'true';
const integrationDescribe = enabled ? describe : describe.skip;

interface TestCustomer {
  phoneNumber: string;
  cookie: string[];
  userId: string;
}

interface TestMerchant {
  email: string;
  cookie: string[];
  userId: string;
}

integrationDescribe('Loyalty ledger foundation integration (PostgreSQL)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let auth: AuthService;
  let ledgerService: LoyaltyLedgerService;
  let customer: TestCustomer;
  let merchant: TestMerchant;
  let otherMerchant: TestMerchant;
  let businessId: string;
  let otherBusinessId: string;
  let branchId: string;
  let membershipId: string;
  let stampConfigId: string;
  let pointConfigId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api'); // as in main.ts; Better Auth basePath is /api/auth
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
    ledgerService = moduleFixture.get<LoyaltyLedgerService>(LoyaltyLedgerService);

    // 1. Setup Merchant and Business
    merchant = await registerMerchant(app, database);
    otherMerchant = await registerMerchant(app, database);

    const http = request(app.getHttpServer());
    const bizRes = await http
      .post('/api/merchants/business-setup/business')
      .set('Cookie', merchant.cookie)
      .send({ name: 'Ledger Integration Business' })
      .expect(201);
    businessId = bizRes.body.business.id;

    const branchRes = await http
      .post('/api/merchants/business-setup/first-branch')
      .set('Cookie', merchant.cookie)
      .send({
        name: 'Ledger Integration Branch',
        address: '100 Ledger Way',
      })
      .expect(201);
    branchId = branchRes.body.branches[0].id;

    const otherBizRes = await http
      .post('/api/merchants/business-setup/business')
      .set('Cookie', otherMerchant.cookie)
      .send({ name: 'Other Ledger Business' })
      .expect(201);
    otherBusinessId = otherBizRes.body.business.id;

    // 2. Setup Program with stamps & points configurations
    const progRes = await http
      .post('/api/programs')
      .set('Cookie', merchant.cookie)
      .send({ type: 'both', configurations: { stamps: {}, points: {} } })
      .expect(201);

    const configs = await database.getPool().query<{ id: string; type: string }>(
      `SELECT pc.id, pc.type FROM program_configurations pc WHERE pc.program_id = $1`,
      [progRes.body.id],
    );
    stampConfigId = configs.rows.find((c) => c.type === 'stamps')!.id;
    pointConfigId = configs.rows.find((c) => c.type === 'points')!.id;

    // 3. Setup Customer and join business
    customer = await registerCustomer(app, auth, database);
    const joinRes = await http
      .post('/api/customers/memberships')
      .set('Cookie', customer.cookie)
      .send({ businessQrId: bizRes.body.business.publicQrId })
      .expect(201);
    membershipId = joinRes.body.id;
  });

  afterAll(async () => {
    // Clean up created entities in foreign key safe order
    const pool = database.getPool();
    if (businessId) {
      // Triggers prevent direct DELETE from loyalty_transactions/loyalty_activity_entries
      // so we use TRUNCATE CASCADE or CASCADE delete on parent business
      // Using TRUNCATE on transactions/entries for clean test teardown:
      await pool.query('TRUNCATE TABLE loyalty_activity_entries CASCADE');
      await pool.query('TRUNCATE TABLE loyalty_transactions CASCADE');
      await pool.query('DELETE FROM membership_lifecycle_events WHERE membership_id = $1', [membershipId]).catch(() => {});
      await pool.query('DELETE FROM customer_business_memberships WHERE business_id = $1', [businessId]).catch(() => {});
      if (customer?.userId) {
        await pool.query('DELETE FROM customer_qr_credentials WHERE customer_account_id IN (SELECT id FROM customer_accounts WHERE user_id = $1)', [customer.userId]).catch(() => {});
      }
      await pool.query('DELETE FROM program_configurations WHERE id IN ($1, $2)', [stampConfigId, pointConfigId]).catch(() => {});
      await pool.query('DELETE FROM programs WHERE business_id = $1', [businessId]).catch(() => {});
      await pool.query('DELETE FROM branches WHERE business_id = $1', [businessId]).catch(() => {});
      await pool.query('DELETE FROM businesses WHERE id IN ($1, $2)', [businessId, otherBusinessId]).catch(() => {});
      if (customer?.userId) {
        await pool.query('DELETE FROM customer_accounts WHERE user_id = $1', [customer.userId]).catch(() => {});
      }
      const userIds = [customer?.userId, merchant?.userId, otherMerchant?.userId].filter(Boolean);
      if (userIds.length > 0) {
        await pool.query('DELETE FROM merchant_accounts WHERE user_id = ANY($1::uuid[])', [userIds]).catch(() => {});
        await pool.query('DELETE FROM sessions WHERE user_id = ANY($1::uuid[])', [userIds]).catch(() => {});
        await pool.query('DELETE FROM accounts WHERE user_id = ANY($1::uuid[])', [userIds]).catch(() => {});
        await pool.query('DELETE FROM users WHERE id IN (SELECT id FROM users WHERE id = ANY($1::uuid[]))', [userIds]).catch(() => {});
      }
    }
    await app.close();
  });

  it('creates an immutable transaction with typed signed entries referencing exact program configurations', async () => {
    const idempotencyKey = `idemp-${randomUUID()}`;
    const result = await ledgerService.createTransaction(merchant.userId, {
      membershipId,
      branchId,
      category: 'purchase',
      idempotencyKey,
      purchaseAmountMillimes: 20000,
      entries: [
        {
          activityType: 'stamps',
          delta: 2,
          programConfigurationId: stampConfigId,
        },
        {
          activityType: 'points',
          delta: 50,
          programConfigurationId: pointConfigId,
          earningRateHundredths: 250,
        },
      ],
    });
    expect(result.entries[1].earningRateHundredths).toBe(250);

    expect(result.id).toBeDefined();
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].delta).toBe(2);
    expect(result.entries[0].activityType).toBe('stamps');
    expect(result.entries[0].programConfigurationId).toBe(stampConfigId);
    expect(result.entries[1].delta).toBe(50);
    expect(result.entries[1].activityType).toBe('points');
    expect(result.entries[1].programConfigurationId).toBe(pointConfigId);

    // Verify row-level immutable trigger prevents modification
    const pool = database.getPool();
    await expect(
      pool.query(
        'UPDATE loyalty_transactions SET category = $1 WHERE id = $2',
        ['manual_adjustment', result.id],
      ),
    ).rejects.toThrow(/append-only/i);

    await expect(
      pool.query(
        'DELETE FROM loyalty_activity_entries WHERE id = $1',
        [result.entries[0].id],
      ),
    ).rejects.toThrow(/append-only/i);
  });

  it('rejects UPDATE of a programme configuration (migration 0014)', async () => {
    await expect(
      database.getPool().query(
        `UPDATE program_configurations SET settings = '{}'::jsonb WHERE id = $1`,
        [stampConfigId],
      ),
    ).rejects.toThrow(/immutable/i);
  });

  it('enforces business-scoped idempotency: same key + same payload returns original outcome', async () => {
    const idempotencyKey = `idemp-${randomUUID()}`;
    const payload = {
      membershipId,
      branchId,
      category: 'purchase' as const,
      idempotencyKey,
      entries: [
        {
          activityType: 'stamps' as const,
          delta: 1,
          programConfigurationId: stampConfigId,
        },
      ],
    };

    const first = await ledgerService.createTransaction(merchant.userId, payload);
    const second = await ledgerService.createTransaction(merchant.userId, payload);

    expect(second.id).toBe(first.id);
    expect(second.entries).toHaveLength(1);
    expect(second.entries[0].id).toBe(first.entries[0].id);

    // Verify only 1 record exists in database
    const pool = database.getPool();
    const countRes = await pool.query<{ count: string }>(
      'SELECT count(*) FROM loyalty_transactions WHERE business_id = $1 AND idempotency_key = $2',
      [businessId, idempotencyKey],
    );
    expect(countRes.rows[0].count).toBe('1');
  });

  it('enforces business-scoped idempotency: same key + different payload returns 409 Conflict', async () => {
    const idempotencyKey = `idemp-${randomUUID()}`;
    await ledgerService.createTransaction(merchant.userId, {
      membershipId,
      category: 'purchase',
      idempotencyKey,
      entries: [
        {
          activityType: 'stamps',
          delta: 1,
          programConfigurationId: stampConfigId,
        },
      ],
    });

    // Attempt replay with different delta
    await expect(
      ledgerService.createTransaction(merchant.userId, {
        membershipId,
        category: 'purchase',
        idempotencyKey,
        entries: [
          {
            activityType: 'stamps',
            delta: 5,
            programConfigurationId: stampConfigId,
          },
        ],
      }),
    ).rejects.toThrow(/already used with a different request/i);
  });

  it('allows same idempotency key across different businesses without collision', async () => {
    // Setup program and membership for otherBusiness
    const http = request(app.getHttpServer());
    const otherProg = await http
      .post('/api/programs')
      .set('Cookie', otherMerchant.cookie)
      .send({ type: 'stamps', configurations: { stamps: {} } })
      .expect(201);

    const otherConfigs = await database.getPool().query<{ id: string }>(
      `SELECT id FROM program_configurations WHERE program_id = $1`,
      [otherProg.body.id],
    );

    const otherBiz = await database.getPool().query<{ public_qr_id: string }>(
      `SELECT public_qr_id FROM businesses WHERE id = $1`,
      [otherBusinessId],
    );

    const otherJoin = await http
      .post('/api/customers/memberships')
      .set('Cookie', customer.cookie)
      .send({ businessQrId: otherBiz.rows[0].public_qr_id })
      .expect(201);

    const sharedIdempotencyKey = `shared-key-${randomUUID()}`;

    // Business 1 uses the key
    const tx1 = await ledgerService.createTransaction(merchant.userId, {
      membershipId,
      category: 'purchase',
      idempotencyKey: sharedIdempotencyKey,
      entries: [
        {
          activityType: 'stamps',
          delta: 1,
          programConfigurationId: stampConfigId,
        },
      ],
    });

    // Business 2 uses the exact same key without colliding
    const tx2 = await ledgerService.createTransaction(otherMerchant.userId, {
      membershipId: otherJoin.body.id,
      category: 'purchase',
      idempotencyKey: sharedIdempotencyKey,
      entries: [
        {
          activityType: 'stamps',
          delta: 2,
          programConfigurationId: otherConfigs.rows[0].id,
        },
      ],
    });

    expect(tx1.id).toBeDefined();
    expect(tx2.id).toBeDefined();
    expect(tx1.id).not.toBe(tx2.id);
  });

  it('supports append-only reversal referencing original transaction and entry', async () => {
    const originalTx = await ledgerService.createTransaction(merchant.userId, {
      membershipId,
      category: 'purchase',
      idempotencyKey: `orig-tx-${randomUUID()}`,
      entries: [
        {
          activityType: 'stamps',
          delta: 3,
          programConfigurationId: stampConfigId,
        },
      ],
    });

    // Reversal compensating entry
    const reversalTx = await ledgerService.createTransaction(merchant.userId, {
      membershipId,
      category: 'reversal',
      idempotencyKey: `rev-tx-${randomUUID()}`,
      reversesTransactionId: originalTx.id,
      reversalReason: 'Integration test correction',
      entries: [
        {
          activityType: 'stamps',
          delta: -3,
          programConfigurationId: stampConfigId,
          reversesEntryId: originalTx.entries[0].id,
        },
      ],
    });

    expect(reversalTx.id).toBeDefined();
    expect(reversalTx.entries[0].delta).toBe(-3);
    expect(reversalTx.entries[0].reversesEntryId).toBe(originalTx.entries[0].id);

    // Verify foreign key integrity in DB
    const pool = database.getPool();
    const storedReversal = await pool.query<{ reverses_transaction_id: string }>(
      'SELECT reverses_transaction_id FROM loyalty_transactions WHERE id = $1',
      [reversalTx.id],
    );
    expect(storedReversal.rows[0].reverses_transaction_id).toBe(originalTx.id);
    // Verify duplicate reversal of the same transaction is rejected
    await expect(
      ledgerService.createTransaction(merchant.userId, {
        membershipId,
        category: 'reversal',
        idempotencyKey: `rev-tx-dup-${randomUUID()}`,
        reversesTransactionId: originalTx.id,
        reversalReason: 'Integration test correction',
        entries: [
          {
            activityType: 'stamps',
            delta: -3,
            programConfigurationId: stampConfigId,
            reversesEntryId: originalTx.entries[0].id,
          },
        ],
      }),
    ).rejects.toThrow(/already been reversed/i);

    // Verify reversal with wrong delta sign is rejected
    const anotherTx = await ledgerService.createTransaction(merchant.userId, {
      membershipId,
      category: 'purchase',
      idempotencyKey: `another-tx-${randomUUID()}`,
      entries: [
        {
          activityType: 'stamps',
          delta: 2,
          programConfigurationId: stampConfigId,
        },
      ],
    });

    await expect(
      ledgerService.createTransaction(merchant.userId, {
        membershipId,
        category: 'reversal',
        idempotencyKey: `rev-tx-wrong-delta-${randomUUID()}`,
        reversesTransactionId: anotherTx.id,
        reversalReason: 'Integration test correction',
        entries: [
          {
            activityType: 'stamps',
            delta: 2, // Should be -2
            programConfigurationId: stampConfigId,
            reversesEntryId: anotherTx.entries[0].id,
          },
        ],
      }),
    ).rejects.toThrow(/exact inverse/i);
  });

  it('rejects cross-business membership or configuration tampering', async () => {
    // Attempt to use Business 1's membership under Business 2
    await expect(
      ledgerService.createTransaction(otherMerchant.userId, {
        membershipId, // belongs to Business 1
        category: 'purchase',
        idempotencyKey: `cross-biz-${randomUUID()}`,
        entries: [
          {
            activityType: 'stamps',
            delta: 1,
            programConfigurationId: stampConfigId,
          },
        ],
      }),
    ).rejects.toThrow(/membership was not found for this business/i);
  });
});

async function registerCustomer(
  app: INestApplication,
  auth: AuthService,
  database: DatabaseService,
): Promise<TestCustomer> {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-11);
  const phoneNumber = `+216${suffix}`;
  const identifier = `phone-number-otp-${phoneNumber}`;
  const http = request(app.getHttpServer());
  await http.post('/api/auth/phone-number/send-otp').send({ phoneNumber }).expect(200);
  const code = (await auth.getBetterAuth().$context).test.getOTP(identifier);
  if (!code) throw new Error('Customer OTP was not created for integration test.');
  const verification = await http
    .post('/api/auth/phone-number/verify')
    .send({ phoneNumber, code })
    .expect(200);
  const cookie = verification.headers['set-cookie'];
  if (!cookie?.length) throw new Error('Customer OTP did not establish a session.');

  const userRes = await database.getPool().query<{ user_id: string }>(
    `SELECT user_id FROM customer_accounts WHERE phone_number = $1`,
    [phoneNumber],
  );
  return { phoneNumber, cookie, userId: userRes.rows[0].user_id };
}

async function registerMerchant(
  app: INestApplication,
  database: DatabaseService,
): Promise<TestMerchant> {
  const email = `ledger-merchant-${randomUUID()}@example.test`;
  const result = await request(app.getHttpServer())
    .post('/api/auth/sign-up/email')
    .send({
      email,
      password: `Test-${randomUUID()}-Password!`,
      name: 'Ledger Integration Merchant',
    })
    .expect(200);
  const cookie = result.headers['set-cookie'];
  if (!cookie?.length) throw new Error('Merchant signup did not establish a session.');

  const userRes = await database.getPool().query<{ id: string }>(
    `SELECT id FROM users WHERE email = $1`,
    [email],
  );
  return { email, cookie, userId: userRes.rows[0].id };
}
