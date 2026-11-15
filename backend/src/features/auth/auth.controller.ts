import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * Phase 1B: Auth Controller
 *
 * Main auth module controller.
 * Auth endpoints are handled by AuthHandler.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
}
