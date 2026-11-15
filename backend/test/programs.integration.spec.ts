import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';

const enabled = process.env.RUN_PROGRAMS_INTEGRATION === 'true';
const integrationDescribe = enabled ? describe : describe.skip;

interface TestMerchant {
  cookie: string[];
}

integrationDescribe('Programme configuration integration', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;
  let merchants: TestMerchant[] = [];
  let businessIds: string[] = [];
  let emails: string[] = [];

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

    emails = Array.from(
      { length: 3 },
      () => `program-config-${randomUUID()}@example.test`,
    );
    for (let index = 0; index < emails.length; index += 1) {
      const merchant = await registerMerchant(emails[index]);
      merchants.push(merchant);
      const business = await request(app.getHttpServer())
        .post('/merchants/business-setup/business')
        .set('Cookie', merchant.cookie)
        .send({ name: `Programme Test Business ${index + 1}` })
        .expect(201);
      businessIds.push(business.body.business.id);
    }
  });

  afterAll(async () => {
    if (databaseService && businessIds.length) {
      await databaseService.getPool().query(
        `DELETE FROM public.program_configurations
         WHERE program_id IN (
           SELECT id FROM public.programs WHERE business_id = ANY($1::uuid[])
         )`,
        [businessIds],
      );
      await databaseService.getPool().query(
        'DELETE FROM public.programs WHERE business_id = ANY($1::uuid[])',
        [businessIds],
      );
    }
    if (databaseService && emails.length) {
      await databaseService
        .getPool()
        .query('DELETE FROM public.users WHERE email = ANY($1::text[])', [emails]);
      const remaining = await databaseService.getPool().query(
        'SELECT id FROM public.users WHERE email = ANY($1::text[])',
        [emails],
      );
      expect(remaining.rowCount).toBe(0);
    }
    await app?.close();
  });

  it('creates supported modes, versions history, and scopes it to the owned business', async () => {
    const http = request(app.getHttpServer());
    await http.get('/programs/current').expect(401);

    const stamps = await http
      .post('/programs')
      .set('Cookie', merchants[0].cookie)
      .send({ type: 'stamps', configurations: { stamps: {} } })
      .expect(201);
    expect(stamps.body).toMatchObject({
      businessId: businessIds[0],
      type: 'stamps',
      version: 1,
      status: 'active',
    });

    await http
      .post('/programs')
      .set('Cookie', merchants[0].cookie)
      .send({ type: 'points', configurations: { points: {} } })
      .expect(409);

    const points = await http
      .post('/programs/versions')
      .set('Cookie', merchants[0].cookie)
      .send({ type: 'points', configurations: { points: {} } })
      .expect(201);
    expect(points.body.version).toBe(2);
    expect(points.body.type).toBe('points');

    const both = await http
      .post('/programs/versions')
      .set('Cookie', merchants[0].cookie)
      .send({ type: 'both', configurations: { stamps: {}, points: {} } })
      .expect(201);
    expect(both.body.version).toBe(3);
    expect(both.body.configurations.map(
      (configuration: { type: string }) => configuration.type,
    )).toEqual(['stamps', 'points']);

    const current = await http
      .get('/programs/current')
      .set('Cookie', merchants[0].cookie)
      .expect(200);
    expect(current.body.id).toBe(both.body.id);
    expect(current.body.status).toBe('active');

    const history = await http
      .get('/programs/history')
      .set('Cookie', merchants[0].cookie)
      .expect(200);
    expect(history.body.map((program: { version: number }) => program.version))
      .toEqual([3, 2, 1]);
    expect(history.body.map((program: { status: string }) => program.status))
      .toEqual(['active', 'inactive', 'inactive']);
    expect(history.body[2].configurations).toEqual([
      { type: 'stamps', settings: {} },
    ]);

    const otherPoints = await http
      .post('/programs')
      .set('Cookie', merchants[1].cookie)
      .send({ type: 'points', configurations: { points: {} } })
      .expect(201);
    expect(otherPoints.body.businessId).toBe(businessIds[1]);
    const otherHistory = await http
      .get('/programs/history')
      .set('Cookie', merchants[1].cookie)
      .expect(200);
    expect(otherHistory.body).toHaveLength(1);
    expect(otherHistory.body[0].id).toBe(otherPoints.body.id);
    expect(otherHistory.body[0].id).not.toBe(stamps.body.id);

    const otherBoth = await http
      .post('/programs')
      .set('Cookie', merchants[2].cookie)
      .send({ type: 'both', configurations: { stamps: {}, points: {} } })
      .expect(201);
    expect(otherBoth.body.businessId).toBe(businessIds[2]);

    await http
      .post('/programs/versions')
      .set('Cookie', merchants[1].cookie)
      .send({
        type: 'stamps',
        configurations: { stamps: {} },
        businessId: businessIds[0],
      })
      .expect(400);

    const unchanged = await http
      .get('/programs/current')
      .set('Cookie', merchants[0].cookie)
      .expect(200);
    expect(unchanged.body.id).toBe(both.body.id);

    await http
      .post('/programs')
      .set('Cookie', merchants[0].cookie)
      .send({ type: 'combined', configurations: { stamps: {}, points: {} } })
      .expect(400);
    await http
      .post('/programs')
      .set('Cookie', merchants[0].cookie)
      .send({ type: 'both', configurations: { stamps: {} } })
      .expect(400);

    await http
      .post('/merchants/business-setup/first-branch')
      .set('Cookie', merchants[0].cookie)
      .send({ name: 'First location', address: '1 Test Street' })
      .expect(201);
    await databaseService.getPool().query(
      `INSERT INTO public.branches (business_id, name, address, qr_code_id)
       VALUES ($1, 'Second location', '2 Test Street', $2)`,
      [businessIds[0], randomUUID()],
    );
    const branchProgramLinks = await databaseService.getPool().query<{ id: string }>(
      `SELECT p.id
       FROM public.branches b
       JOIN public.programs p
         ON p.business_id = b.business_id AND p.status = 'active'
       WHERE b.business_id = $1
       ORDER BY b.created_at, b.id`,
      [businessIds[0]],
    );
    expect(branchProgramLinks.rows).toHaveLength(2);
    expect(branchProgramLinks.rows.map(({ id }) => id)).toEqual([
      both.body.id,
      both.body.id,
    ]);

    const persistedConfigurationCount = await databaseService.getPool().query<{ count: number }>(
      `SELECT count(*)::int AS count
       FROM public.program_configurations pc
       JOIN public.programs p ON p.id = pc.program_id
       WHERE p.business_id = $1`,
      [businessIds[0]],
    );
    expect(persistedConfigurationCount.rows[0].count).toBe(4);
  });

  async function registerMerchant(email: string): Promise<TestMerchant> {
    const response = await request(app.getHttpServer())
      .post('/auth/sign-up/email')
      .send({
        email,
        password: `Test-${randomUUID()}-Password!`,
        name: 'Synthetic Programme Merchant',
      })
      .expect(200);
    const cookie = response.headers['set-cookie'];
    if (!cookie?.length) {
      throw new Error('Merchant registration did not establish a session cookie.');
    }
    return { cookie };
  }
});
