import { Controller, Get, UseGuards } from '@nestjs/common';
import { MerchantGuard } from '../../shared/guards/merchant.guard';
import { CurrentUser, CurrentUserPayload } from '../../shared/decorators/current-user.decorator';

/**
 * Phase 1B: Merchants Controller (Test Endpoints)
 *
 * Demonstrates merchant authentication and authorization.
 * These endpoints are for testing and verification only.
 * Not for production use.
 */
@Controller('merchants')
export class MerchantsController {
  /**
   * Test endpoint: Get merchant profile.
   * Requires MerchantGuard (authenticated user with merchant account).
   *
   * Success: 200 OK with user and merchant account info
   * No session: 401 Unauthorized
   * No merchant account: 403 Forbidden
   */
  @Get('/profile')
  @UseGuards(MerchantGuard)
  async getMerchantProfile(@CurrentUser() user: CurrentUserPayload) {
    return {
      message: '✅ Merchant profile accessed',
      userId: user.id,
      merchantAccount: user.merchantAccount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Test endpoint: Get merchant dashboard.
   * Requires MerchantGuard.
   */
  @Get('/dashboard')
  @UseGuards(MerchantGuard)
  async getMerchantDashboard(@CurrentUser() user: CurrentUserPayload) {
    return {
      message: '✅ Merchant dashboard accessed',
      userId: user.id,
      timestamp: new Date().toISOString(),
      note: 'Program configuration and analytics would go here in production',
    };
  }

  /**
   * Public endpoint: Check merchant service status.
   * No authentication required.
   */
  @Get('/health')
  async getHealth() {
    return {
      service: 'merchant',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
