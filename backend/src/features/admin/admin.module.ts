import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';

/**
 * Phase 1B: Admin Module (Skeleton)
 *
 * Responsible for:
 * - Platform administration
 * - Merchant onboarding
 * - System health
 * - Audit logs
 *
 * Phase 1B: Not implemented yet.
 * Phase 2+: Full implementation.
 */
@Module({
  imports: [SharedModule],
})
export class AdminModule {}
