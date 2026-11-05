/**
 * Phase 1B: Express Request Type Extensions
 *
 * Extends Express Request to include user context attached by
 * SessionValidationMiddleware and guards.
 */
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        customerAccount?: any;
        merchantAccount?: any;
      };
    }
  }
}

export {};
