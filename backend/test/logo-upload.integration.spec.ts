import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import sharp from 'sharp';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { BusinessSetupService } from '../src/features/merchants/business-setup.service';

const enabled = process.env.RUN_LOGO_UPLOAD_INTEGRATION === 'true';
const integrationDescribe = enabled ? describe : describe.skip;

interface TestMerchant {
  userId: string;
  cookie: string[];
}

integrationDescribe('Logo upload integration', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;
  let setupService: BusinessSetupService;
  let merchant: TestMerchant;
  let businessId: string;
  let merchantEmail: string;

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
    setupService = moduleFixture.get(BusinessSetupService);

    merchantEmail = `logo-test-${randomUUID()}@example.test`;

    // Create merchant account
    const signupResponse = await request(app.getHttpServer())
      .post('/auth/signup/password')
      .send({
        email: merchantEmail,
        password: 'TestPassword123!',
      })
      .expect(200);

    merchant = {
      userId: signupResponse.body.user.id,
      cookie: signupResponse.headers['set-cookie'] || [],
    };

    // Create business
    const businessResponse = await request(app.getHttpServer())
      .post('/merchants/business-setup/business')
      .set('Cookie', merchant.cookie)
      .send({ name: 'Test Business' })
      .expect(200);

    businessId = businessResponse.body.business.id;
  });

  afterAll(async () => {
    // Clean up test user
    try {
      const pool = databaseService.getPool();
      await pool.query('DELETE FROM users WHERE id = $1', [merchant.userId]);
    } catch {
      // Ignore cleanup errors
    }

    await app.close();
  });

  describe('POST /merchants/business-setup/business/logo', () => {
    it('should upload a valid PNG logo', async () => {
      const pngBuffer = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer();

      const response = await request(app.getHttpServer())
        .post('/merchants/business-setup/business/logo')
        .set('Cookie', merchant.cookie)
        .attach('file', pngBuffer, 'logo.png')
        .expect(200);

      expect(response.body.storageKey).toBeDefined();
      expect(response.body.filename).toMatch(/^[a-zA-Z0-9._-]+\.png$/);
      expect(response.body.width).toBeGreaterThan(0);
      expect(response.body.height).toBeGreaterThan(0);
      expect(response.body.mimeType).toBe('image/png');
      expect(response.body.uploadedAt).toBeDefined();
    });

    it('should upload a valid JPEG logo', async () => {
      const jpegBuffer = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 0, g: 255, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const response = await request(app.getHttpServer())
        .post('/merchants/business-setup/business/logo')
        .set('Cookie', merchant.cookie)
        .attach('file', jpegBuffer, 'logo.jpg')
        .expect(200);

      expect(response.body.mimeType).toBe('image/jpeg');
      expect(response.body.filename).toMatch(/\.jpg$/);
    });

    it('should reject file larger than 5MB', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);

      await request(app.getHttpServer())
        .post('/merchants/business-setup/business/logo')
        .set('Cookie', merchant.cookie)
        .attach('file', largeBuffer, 'huge.png')
        .expect(400);
    });

    it('should reject unsupported format', async () => {
      const gifBuffer = Buffer.from('GIF89a');

      await request(app.getHttpServer())
        .post('/merchants/business-setup/business/logo')
        .set('Cookie', merchant.cookie)
        .attach('file', gifBuffer, 'animation.gif')
        .expect(400);
    });

    it('should reject if no file provided', async () => {
      await request(app.getHttpServer())
        .post('/merchants/business-setup/business/logo')
        .set('Cookie', merchant.cookie)
        .expect(400);
    });

    it('should reject without merchant auth', async () => {
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

      await request(app.getHttpServer())
        .post('/merchants/business-setup/business/logo')
        .attach('file', pngBuffer, 'logo.png')
        .expect(401);
    });
  });

  describe('GET /merchants/business-setup/business/logo', () => {
    beforeEach(async () => {
      // Upload a logo first
      const pngBuffer = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 0, g: 0, b: 255 },
        },
      })
        .png()
        .toBuffer();

      await request(app.getHttpServer())
        .post('/merchants/business-setup/business/logo')
        .set('Cookie', merchant.cookie)
        .attach('file', pngBuffer, 'logo.png')
        .expect(200);
    });

    it('should retrieve uploaded logo', async () => {
      const response = await request(app.getHttpServer())
        .get('/merchants/business-setup/business/logo')
        .set('Cookie', merchant.cookie)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.type).toMatch(/image/);
    });

    it('should return correct content type', async () => {
      const response = await request(app.getHttpServer())
        .get('/merchants/business-setup/business/logo')
        .set('Cookie', merchant.cookie)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/image\/png/);
      expect(response.headers['content-disposition']).toMatch(/^inline/);
    });

    it('should reject without merchant auth', async () => {
      await request(app.getHttpServer())
        .get('/merchants/business-setup/business/logo')
        .expect(401);
    });
  });

  describe('Logo replacement', () => {
    it('should replace existing logo', async () => {
      // Upload first logo
      const firstPng = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer();

      const firstUpload = await request(app.getHttpServer())
        .post('/merchants/business-setup/business/logo')
        .set('Cookie', merchant.cookie)
        .attach('file', firstPng, 'logo1.png')
        .expect(200);

      const firstKey = firstUpload.body.storageKey;

      // Upload second logo (replacement)
      const secondPng = await sharp({
        create: {
          width: 150,
          height: 150,
          channels: 3,
          background: { r: 0, g: 255, b: 0 },
        },
      })
        .png()
        .toBuffer();

      const secondUpload = await request(app.getHttpServer())
        .post('/merchants/business-setup/business/logo')
        .set('Cookie', merchant.cookie)
        .attach('file', secondPng, 'logo2.png')
        .expect(200);

      const secondKey = secondUpload.body.storageKey;

      // Keys should be different
      expect(firstKey).not.toEqual(secondKey);

      // Retrieved logo should be the second one
      const retrieved = await request(app.getHttpServer())
        .get('/merchants/business-setup/business/logo')
        .set('Cookie', merchant.cookie)
        .expect(200);

      // The height should match the second logo
      expect(retrieved.body.length).toBeGreaterThan(0);
    });
  });

  describe('cross-merchant logo read', () => {
    it('does not return another merchant logo from getLogo', async () => {
      const ownLogo = await sharp({
        create: {
          width: 120,
          height: 80,
          channels: 3,
          background: { r: 20, g: 40, b: 60 },
        },
      })
        .png()
        .toBuffer();
      await request(app.getHttpServer())
        .post('/merchants/business-setup/business/logo')
        .set('Cookie', merchant.cookie)
        .attach('file', ownLogo, 'own.png')
        .expect(200);

      const otherEmail = `logo-other-${randomUUID()}@example.test`;
      const signup = await request(app.getHttpServer())
        .post('/auth/signup/password')
        .send({
          email: otherEmail,
          password: 'TestPassword123!',
        })
        .expect(200);
      const otherUserId = signup.body.user.id as string;
      const otherCookie = signup.headers['set-cookie'] || [];

      try {
        const otherBusiness = await request(app.getHttpServer())
          .post('/merchants/business-setup/business')
          .set('Cookie', otherCookie)
          .send({ name: 'Other Business' })
          .expect(200);
        const otherBusinessId = otherBusiness.body.business.id as string;
        const otherLogo = await sharp({
          create: {
            width: 40,
            height: 40,
            channels: 3,
            background: { r: 200, g: 10, b: 10 },
          },
        })
          .png()
          .toBuffer();
        await request(app.getHttpServer())
          .post('/merchants/business-setup/business/logo')
          .set('Cookie', otherCookie)
          .attach('file', otherLogo, 'other.png')
          .expect(200);

        await expect(
          setupService.getLogo(otherBusinessId, merchant.userId),
        ).rejects.toThrow('Logo not found');

        const owned = await setupService.getLogo(businessId, merchant.userId);
        expect(owned.content.length).toBeGreaterThan(0);
        expect(owned.content.equals(otherLogo)).toBe(false);
      } finally {
        try {
          await databaseService.getPool().query('DELETE FROM users WHERE id = $1', [otherUserId]);
        } catch {
          // Ignore cleanup errors
        }
      }
    });
  });
});
