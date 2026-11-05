import { Controller, Get, UseGuards } from '@nestjs/common';
import { CustomerGuard } from '../../shared/guards/customer.guard';
import { CurrentUser, CurrentUserPayload } from '../../shared/decorators/current-user.decorator';

/**
 * Phase 1B: Customer Controller (Test Endpoints)
 *
 * Demonstrates customer authentication and authorization.
 * These endpoints are for testing and verification only.
 * Not for production use.
 */
@Controller('customers')
export class CustomersController {
  /**
   * Test endpoint: Get customer profile.
   * Requires CustomerGuard (authenticated user with customer account).
   *
   * Success: 200 OK with user and customer account info
   * No session: 401 Unauthorized
   * No customer account: 403 Forbidden
   */
  @Get('/profile')
  @UseGuards(CustomerGuard)
  async getCustomerProfile(@CurrentUser() user: CurrentUserPayload) {
    return {
      message: '✅ Customer profile accessed',
      userId: user.id,
      customerAccount: user.customerAccount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Test endpoint: Get customer dashboard.
   * Requires CustomerGuard.
   */
  @Get('/dashboard')
  @UseGuards(CustomerGuard)
  async getCustomerDashboard(@CurrentUser() user: CurrentUserPayload) {
    return {
      message: '✅ Customer dashboard accessed',
      userId: user.id,
      timestamp: new Date().toISOString(),
      note: 'Loyalty transaction data would go here in production',
    };
  }

  /**
   * Public endpoint: Check customer service status.
   * No authentication required.
   */
  @Get('/health')
  async getHealth() {
    return {
      service: 'customer',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
