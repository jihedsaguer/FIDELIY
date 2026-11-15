import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CustomerGuard } from '../../shared/guards/customer.guard';
import { CurrentUser, CurrentUserPayload } from '../../shared/decorators/current-user.decorator';
import { CustomerMembershipService } from './customer-membership.service';
import { JoinBusinessDto } from './dto/customer-membership.dto';

@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customerMemberships: CustomerMembershipService,
  ) {}

  /**
   * Get customer profile.
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

  @Get('/businesses/qr/:businessQrId')
  @UseGuards(CustomerGuard)
  discoverBusiness(
    @CurrentUser() user: CurrentUserPayload,
    @Param('businessQrId', new ParseUUIDPipe()) businessQrId: string,
  ) {
    return this.customerMemberships.discoverBusiness(user.id, businessQrId);
  }

  @Get('/branches/qr/:branchQrId')
  @UseGuards(CustomerGuard)
  discoverBranch(
    @CurrentUser() user: CurrentUserPayload,
    @Param('branchQrId') branchQrId: string,
  ) {
    return this.customerMemberships.discoverBranch(user.id, branchQrId);
  }

  @Post('/memberships')
  @UseGuards(CustomerGuard)
  joinBusiness(
    @CurrentUser() user: CurrentUserPayload,
    @Body() input: JoinBusinessDto,
  ) {
    return this.customerMemberships.joinBusiness(user.id, input);
  }

  @Get('/memberships')
  @UseGuards(CustomerGuard)
  listMemberships(@CurrentUser() user: CurrentUserPayload) {
    return this.customerMemberships.listMemberships(user.id);
  }

  @Get('/memberships/:membershipId')
  @UseGuards(CustomerGuard)
  getMembership(
    @CurrentUser() user: CurrentUserPayload,
    @Param('membershipId', new ParseUUIDPipe()) membershipId: string,
  ) {
    return this.customerMemberships.getMembership(user.id, membershipId);
  }

  @Post('/memberships/:membershipId/leave')
  @UseGuards(CustomerGuard)
  leaveMembership(
    @CurrentUser() user: CurrentUserPayload,
    @Param('membershipId', new ParseUUIDPipe()) membershipId: string,
  ) {
    return this.customerMemberships.leaveMembership(user.id, membershipId);
  }

  @Get('/personal-qr')
  @UseGuards(CustomerGuard)
  getPersonalQrCredential(@CurrentUser() user: CurrentUserPayload) {
    return this.customerMemberships.getPersonalQrCredential(user.id);
  }

  @Post('/personal-qr')
  @UseGuards(CustomerGuard)
  issuePersonalQrCredential(@CurrentUser() user: CurrentUserPayload) {
    return this.customerMemberships.issuePersonalQrCredential(user.id);
  }

  @Post('/personal-qr/rotate')
  @UseGuards(CustomerGuard)
  rotatePersonalQrCredential(@CurrentUser() user: CurrentUserPayload) {
    return this.customerMemberships.rotatePersonalQrCredential(user.id);
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
