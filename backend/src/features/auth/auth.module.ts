import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { AuthHandler } from "./auth.handler";
import { SessionService } from "./session.service";
import { PhoneAuthService } from "./phone-auth.service";
import { SharedModule } from "../../shared/shared.module";
import { RateLimitService } from "../../shared/security/rate-limit.service";

@Module({
  imports: [SharedModule],
  providers: [AuthService, SessionService, PhoneAuthService, RateLimitService],
  controllers: [AuthController, AuthHandler],
  exports: [AuthService, SessionService, PhoneAuthService, RateLimitService],
})
export class AuthModule {}
