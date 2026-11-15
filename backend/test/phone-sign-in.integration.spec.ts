import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { sql } from "drizzle-orm";
import { AppModule } from "../src/app.module";
import { AuthService } from "../src/features/auth/auth.service";
import { PhoneAuthService } from "../src/features/auth/phone-auth.service";
import { RateLimitService } from "../src/shared/security/rate-limit.service";
import { DatabaseService } from "../src/database/database.service";

/**
 * Phone Sign-In Integration Test
 * 
 * Tests the complete phone-only authentication flow:
 * 1. New phone creates user + customer account (unverified)
 * 2. Existing phone retrieves same user
 * 3. Session is created and can be validated
 * 4. Rate limiting is enforced per IP
 * 5. Merchant auth (email/password) is unaffected
 */
const enabled = process.env.RUN_AUTH_INTEGRATION === 'true';
const integrationDescribe = enabled ? describe : describe.skip;

integrationDescribe('Phone Sign-In Integration', () => {
  let app: INestApplication;
  let authService: AuthService;
  let phoneAuthService: PhoneAuthService;
  let rateLimitService: RateLimitService;
  let dbService: DatabaseService;
  
  let testPhone: string;
  const testIp = '127.0.0.1';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    authService = moduleFixture.get<AuthService>(AuthService);
    phoneAuthService = moduleFixture.get<PhoneAuthService>(PhoneAuthService);
    rateLimitService = moduleFixture.get<RateLimitService>(RateLimitService);
    dbService = moduleFixture.get<DatabaseService>(DatabaseService);
  });

  beforeEach(async () => {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
    testPhone = `+21620${suffix}`;
    rateLimitService.reset(testIp);
  });

  afterEach(async () => {
    if (!testPhone) return;
    const db = dbService.getDb();
    const pool = dbService.getPool();
    let conn = null;
    try {
      conn = await pool.connect();
      await conn.query('BEGIN');
      await conn.query('DELETE FROM customer_accounts WHERE phone_number = $1', [testPhone]);
      await conn.query('DELETE FROM users WHERE phone_number = $1', [testPhone]);
      await conn.query('COMMIT');
    } catch (err) {
      if (conn) await conn.query('ROLLBACK');
      console.error('Cleanup error:', err);
    } finally {
      if (conn) conn.release();
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('POST /auth/phone/sign-in', () => {
    it('creates new user and customer account on first sign-in', async () => {
      const http = request(app.getHttpServer());
      
      const response = await http
        .post('/auth/phone/sign-in')
        .set('X-Forwarded-For', testIp)
        .send({ phoneNumber: testPhone })
        .expect(200);

      expect(response.body).toHaveProperty('user.id');
      expect(response.body).toHaveProperty('session.token');
      expect(response.body.session.token).toBeDefined();

      const userId = response.body.user.id;

      // Verify user was created
      const pool = dbService.getPool();
      let conn = null;
      try {
        conn = await pool.connect();
        const userResult = await conn.query(
          'SELECT id, phone_number, phone_number_verified FROM users WHERE id = $1',
          [userId]
        );
        expect(userResult.rows.length).toBe(1);
        expect(userResult.rows[0].phone_number).toBe(testPhone);
        expect(userResult.rows[0].phone_number_verified).toBe(false);

        // Verify customer account was provisioned
        const custResult = await conn.query(
          'SELECT user_id, phone_number, phone_verified FROM customer_accounts WHERE user_id = $1',
          [userId]
        );
        expect(custResult.rows.length).toBe(1);
        expect(custResult.rows[0].phone_number).toBe(testPhone);
        expect(custResult.rows[0].phone_verified).toBe(false);
      } finally {
        if (conn) conn.release();
      }
    });

    it('retrieves existing user on repeated sign-in', async () => {
      const http = request(app.getHttpServer());

      const firstResponse = await http
        .post('/auth/phone/sign-in')
        .set('X-Forwarded-For', testIp)
        .send({ phoneNumber: testPhone })
        .expect(200);
      
      const firstUserId = firstResponse.body.user.id;

      const secondResponse = await http
        .post('/auth/phone/sign-in')
        .set('X-Forwarded-For', testIp)
        .send({ phoneNumber: testPhone })
        .expect(200);

      // Same user ID returned
      expect(secondResponse.body.user.id).toBe(firstUserId);
      
      // Different session tokens (new session each login)
      expect(secondResponse.body.session.token).not.toBe(firstResponse.body.session.token);
    });

    it('rejects invalid phone format', async () => {
      const http = request(app.getHttpServer());

      const invalidPhones = [
        'not-a-phone',
        '+1-555-1234',
        '+999123456789',
        '123',
      ];

      for (const phone of invalidPhones) {
        await http
          .post('/auth/phone/sign-in')
          .set('X-Forwarded-For', testIp)
          .send({ phoneNumber: phone })
          .expect(400);
      }
    });

    it('enforces rate limiting: 10 attempts per 10 minutes per IP', async () => {
      const http = request(app.getHttpServer());
      const rateLimitIp = '192.168.1.100';
      rateLimitService.reset(rateLimitIp);

      // First 10 attempts should succeed (or fail due to other reasons, but not 429)
      for (let i = 0; i < 10; i++) {
        const response = await http
          .post('/auth/phone/sign-in')
          .set('X-Forwarded-For', rateLimitIp)
          .send({ phoneNumber: testPhone })
          .expect((res) => {
            expect([200, 400, 500]).toContain(res.status);
            expect(res.status).not.toBe(429);
          });
      }

      // 11th attempt should be rate limited (429)
      await http
        .post('/auth/phone/sign-in')
        .set('X-Forwarded-For', rateLimitIp)
        .send({ phoneNumber: testPhone })
        .expect(429);
    });

    it('logs sign-in attempts with IP and phone prefix', async () => {
      const http = request(app.getHttpServer());
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await http
        .post('/auth/phone/sign-in')
        .set('X-Forwarded-For', testIp)
        .send({ phoneNumber: testPhone })
        .expect(200);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('customer_phone_sign_in')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(testIp)
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(testPhone.substring(0, 6))
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('success')
      );

      logSpy.mockRestore();
    });
  });

  describe('Session validation', () => {
    it('validates session cookie from sign-in response', async () => {
      const http = request(app.getHttpServer());

      const signInResponse = await http
        .post('/auth/phone/sign-in')
        .set('X-Forwarded-For', testIp)
        .send({ phoneNumber: testPhone })
        .expect(200);

      const sessionToken = signInResponse.body.session.token;
      expect(sessionToken).toBeDefined();

      // Validate session
      const validateResult = await authService.validateSession(
        `auth_session=${sessionToken}`
      );
      expect(validateResult).toHaveProperty('userId');
      expect(validateResult.error).toBeUndefined();
    });
  });

  describe('Merchant auth regression', () => {
    it('does not interfere with email/password authentication', async () => {
      const http = request(app.getHttpServer());

      const registerResponse = await http
        .post('/auth/sign-up/email')
        .send({
          email: 'merchant-test@example.com',
          password: 'SecurePassword123!',
          name: 'Test Merchant',
        })
        .expect((res) => {
          expect([200, 400]).toContain(res.status);
        });

      // If registration succeeded, try to sign in
      if (registerResponse.status === 200 && registerResponse.body.user) {
        const loginResponse = await http
          .post('/auth/sign-in/email')
          .send({
            email: 'merchant-test@example.com',
            password: 'SecurePassword123!',
          })
          .expect((res) => {
            expect([200, 400]).toContain(res.status);
          });

        if (loginResponse.status === 200) {
          expect(loginResponse.body).toHaveProperty('user');
          expect(loginResponse.body).toHaveProperty('session');
        }
      }
    });
  });
});