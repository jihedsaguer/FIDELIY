import { OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SessionService } from './session.service';
import { TenantContextService } from '../../shared/database/tenant-context.service';
export declare class AuthService implements OnModuleInit {
    private databaseService;
    private sessionService;
    private tenantContextService;
    private betterAuthInstance;
    constructor(databaseService: DatabaseService, sessionService: SessionService, tenantContextService: TenantContextService);
    private validateProductionSecret;
    onModuleInit(): Promise<void>;
    getBetterAuth(): any;
    getPool(): import("pg").Pool;
    validateSession(cookieHeader: string): Promise<{
        userId?: string;
        error?: string;
        attemptedUserId?: string;
    } | null>;
    private parseCookies;
    getCurrentUser(cookieHeader: string): Promise<any>;
    verifyPhoneOTP(phoneNumber: string, code: string): Promise<any>;
    sendPhoneOTP(phoneNumber: string): Promise<any>;
    phoneSignIn(normalizedPhone: string): Promise<{
        user: {
            id: string;
        };
        session: {
            id: `${string}-${string}-${string}-${string}-${string}`;
            token: `${string}-${string}-${string}-${string}-${string}`;
            expiresAt: string;
            userId: string;
        };
    }>;
}
//# sourceMappingURL=auth.service.d.ts.map