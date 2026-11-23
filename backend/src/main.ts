/// <reference path="./types/express.d.ts" />
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { validateCustomerQrSecretForProduction } from './shared/security/customer-qr';
import { validatePublicUrlsForProduction } from './features/auth/better-auth.config';

async function bootstrap() {
  // CUSTOMER_QR_SECRET is required in production (DECISIONS.md #20).
  validateCustomerQrSecretForProduction();
  // BETTER_AUTH_URL and FRONTEND_URL must be https in production, so the
  // localhost fallbacks (here and in better-auth.config.ts) are dev/test only.
  validatePublicUrlsForProduction();
  const app = await NestFactory.create(AppModule);

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS: FRONTEND_URL is validated above in production; the fallback is dev/test only.
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
