import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { Express } from 'express';
import { MerchantGuard } from '../../shared/guards/merchant.guard';
import { CurrentUser, CurrentUserPayload } from '../../shared/decorators/current-user.decorator';
import {
  CreateBusinessDto,
  CreateFirstBranchDto,
  UpdateBusinessSetupDto,
  UpdateFirstBranchDto,
} from './dto/business-setup.dto';
import {
  CreateBranchDto,
  UpdateBranchDto,
  BranchResponseDto,
  BranchListResponseDto,
} from './dto/branch.dto';
import { LogoUploadResponseDto } from './dto/logo-upload.dto';
import { BusinessSetupService } from './business-setup.service';
import { BranchService } from './branch.service';
import { MerchantCustomerService } from './merchant-customer.service';
import { MerchantTransactionService } from './merchant-transaction.service';
import { ResolveCustomerQrDto } from './dto/resolve-customer-qr.dto';
import {
  ResolveCustomerForTransactionDto,
  CalculateEarningsDto,
  CreateLoyaltyTransactionDto,
  RedeemRewardDto,
  CustomerForTransactionResponse,
  CalculateEarningsResponse,
  CreateLoyaltyTransactionResponse,
  RedeemRewardResponse,
} from './dto/merchant-transaction.dto';

/**
 * Merchant profile and owner-scoped business setup endpoints.
 */
@Controller('merchants')
export class MerchantsController {
  constructor(
    private readonly businessSetupService: BusinessSetupService,
    private readonly branchService: BranchService,
    private readonly merchantCustomers: MerchantCustomerService,
    private readonly merchantTransactions: MerchantTransactionService,
  ) {}

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

  @Get('business-setup')
  @UseGuards(MerchantGuard)
  getBusinessSetup(@CurrentUser() user: CurrentUserPayload) {
    return this.businessSetupService.getSetup(user.id);
  }

  @Post('business-setup/business')
  @UseGuards(MerchantGuard)
  createBusiness(
    @CurrentUser() user: CurrentUserPayload,
    @Body() input: CreateBusinessDto,
  ) {
    return this.businessSetupService.createBusiness(user.id, input);
  }

  @Patch('business-setup/business')
  @UseGuards(MerchantGuard)
  updateBusiness(
    @CurrentUser() user: CurrentUserPayload,
    @Body() input: UpdateBusinessSetupDto,
  ) {
    return this.businessSetupService.updateBusiness(user.id, input);
  }

  @Post('business-setup/first-branch')
  @UseGuards(MerchantGuard)
  createFirstBranch(
    @CurrentUser() user: CurrentUserPayload,
    @Body() input: CreateFirstBranchDto,
  ) {
    return this.businessSetupService.createFirstBranch(user.id, input);
  }

  @Patch('business-setup/first-branch')
  @UseGuards(MerchantGuard)
  updateFirstBranch(
    @CurrentUser() user: CurrentUserPayload,
    @Body() input: UpdateFirstBranchDto,
  ) {
    return this.businessSetupService.updateFirstBranch(user.id, input);
  }

  @Post('business-setup/complete')
  @UseGuards(MerchantGuard)
  completeBusinessSetup(@CurrentUser() user: CurrentUserPayload) {
    return this.businessSetupService.completeSetup(user.id);
  }

  @Post('customers/resolve-qr')
  @UseGuards(MerchantGuard)
  resolveCustomerQr(
    @CurrentUser() user: CurrentUserPayload,
    @Body() input: ResolveCustomerQrDto,
  ) {
    return this.merchantCustomers.resolveCustomerQr(user.id, input.credential);
  }

  /**
   * Resolve a customer QR for a loyalty transaction.
   * Returns customer info, balance, programme details, and eligible rewards.
   */
  @Post('customers/resolve-for-transaction')
  @UseGuards(MerchantGuard)
  resolveCustomerForTransaction(
    @CurrentUser() user: CurrentUserPayload,
    @Body() input: ResolveCustomerForTransactionDto,
  ): Promise<CustomerForTransactionResponse> {
    return this.merchantTransactions.resolveCustomerForTransaction(
      user.id,
      input.qrCredential,
      input.branchId,
    );
  }

  /**
   * Calculate loyalty earnings for a purchase amount.
   * Returns the stamps and points that would be earned.
   */
  @Post('transactions/calculate-earnings')
  @UseGuards(MerchantGuard)
  calculateEarnings(
    @CurrentUser() user: CurrentUserPayload,
    @Body() input: CalculateEarningsDto,
  ): Promise<CalculateEarningsResponse> {
    return this.merchantTransactions.calculateEarnings(user.id, input);
  }

  /**
   * Create a loyalty transaction for a customer.
   * Records stamps and/or points earned from a purchase.
   */
  @Post('transactions')
  @UseGuards(MerchantGuard)
  createLoyaltyTransaction(
    @CurrentUser() user: CurrentUserPayload,
    @Body() input: CreateLoyaltyTransactionDto,
  ): Promise<CreateLoyaltyTransactionResponse> {
    return this.merchantTransactions.createLoyaltyTransaction(user.id, input);
  }

  /**
   * Redeem a reward for a customer.
   * Deducts the reward cost from the customer's balance.
   */
  @Post('transactions/redeem-reward')
  @UseGuards(MerchantGuard)
  redeemReward(
    @CurrentUser() user: CurrentUserPayload,
    @Body() input: RedeemRewardDto,
  ): Promise<RedeemRewardResponse> {
    return this.merchantTransactions.redeemReward(user.id, input);
  }

  /**
   * Upload a device-based logo for the authenticated merchant's business.
   * Requires MerchantGuard and a valid image file.
   *
   * Request: multipart/form-data with file field
   * Success: 200 OK with logo metadata (storage key, dimensions, MIME type)
   * Validation: 400 Bad Request if file is invalid (size, format, content)
   * No business: 404 Not Found
   */
  @Post('business-setup/business/logo')
  @UseGuards(MerchantGuard)
  @UseInterceptors(FileInterceptor('file', { storage: undefined }))
  async uploadLogo(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: any,
  ): Promise<LogoUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.businessSetupService.uploadLogo(
      user.id,
      file.buffer,
      file.mimetype,
    );

    return {
      storageKey: result.storageKey,
      filename: result.filename,
      width: result.width,
      height: result.height,
      mimeType: result.mimeType,
      uploadedAt: result.uploadedAt,
    };
  }

  /**
   * Retrieve the authenticated merchant's business logo.
   * Requires MerchantGuard.
   *
   * Success: 200 OK with image file and appropriate Content-Type header
   * No logo: 404 Not Found
   */
  @Get('business-setup/business/logo')
  @UseGuards(MerchantGuard)
  async getLogo(
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
  ): Promise<void> {
    const setup = await this.businessSetupService.getSetup(user.id);
    if (!setup.business) {
      throw new BadRequestException('Business not found');
    }

    const logo = await this.businessSetupService.getLogo(setup.business.id, user.id);

    res.setHeader('Content-Type', logo.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${logo.filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(logo.content);
  }

  /**
   * List all branches for the authenticated merchant's business.
   */
  @Get('branches')
  @UseGuards(MerchantGuard)
  async listBranches(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<BranchListResponseDto> {
    return this.branchService.listBranches(user.id);
  }

  /**
   * Get a specific branch by ID.
   */
  @Get('branches/:branchId')
  @UseGuards(MerchantGuard)
  async getBranch(
    @CurrentUser() user: CurrentUserPayload,
    @Param('branchId') branchId: string,
  ): Promise<BranchResponseDto> {
    return this.branchService.getBranch(user.id, branchId);
  }

  /**
   * Create a new branch for the authenticated merchant's business.
   */
  @Post('branches')
  @UseGuards(MerchantGuard)
  async createBranch(
    @CurrentUser() user: CurrentUserPayload,
    @Body() input: CreateBranchDto,
  ): Promise<BranchResponseDto> {
    return this.branchService.createBranch(user.id, input);
  }

  /**
   * Update an existing branch.
   */
  @Patch('branches/:branchId')
  @UseGuards(MerchantGuard)
  async updateBranch(
    @CurrentUser() user: CurrentUserPayload,
    @Param('branchId') branchId: string,
    @Body() input: UpdateBranchDto,
  ): Promise<BranchResponseDto> {
    return this.branchService.updateBranch(user.id, branchId, input);
  }

  /**
   * Delete a branch.
   */
  @Delete('branches/:branchId')
  @UseGuards(MerchantGuard)
  async deleteBranch(
    @CurrentUser() user: CurrentUserPayload,
    @Param('branchId') branchId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.branchService.deleteBranch(user.id, branchId);
    return {
      success: true,
      message: 'Branch deleted successfully',
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
