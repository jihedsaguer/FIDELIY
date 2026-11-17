import { Request } from 'express';
export declare class SessionService {
    extractCookieHeader(request: Request): string | null;
    isValidToken(token: string | null | undefined): boolean;
}
//# sourceMappingURL=session.service.d.ts.map