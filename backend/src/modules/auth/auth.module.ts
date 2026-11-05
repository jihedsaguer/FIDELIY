import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthHandler } from './auth.handler';
import { SessionService } from './session.service';
import { SharedModule } from '../../shared/shared.module';

/**
 * Phase 1B: Auth Module
 *
 * Responsible for:
 * - Better Auth initialization (phone OTP + email/password)
 * - Session management and validation
 * - Authentication endpoint handler
 * - Phone and email verification
 *
 * Does NOT:
 * - Business logic (kept in domain modules)
 * - Account type enforcement (handled by NestJS guards in shared module)
 * - Account creation flows (deferred to Milestone 3+)
 */
@Module({
  imports: [SharedModule],
  providers: [AuthService, SessionService],
  controllers: [AuthController, AuthHandler],
  exports: [AuthService, SessionService],
})
export class AuthModule {}

