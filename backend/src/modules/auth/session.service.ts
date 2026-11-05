import { Injectable } from '@nestjs/common';
import { Request } from 'express';

/**
 * Phase 1B: Session Service
 *
 * Handles session token extraction and validation utilities.
 *
 * Better Auth stores session token in:
 * - Cookie: better-auth.session_token (if httpOnly enabled)
 * - Authorization header: Bearer token (if using header-based auth)
 *
 * This service extracts tokens from requests; actual validation is done by AuthService.
 */
@Injectable()
export class SessionService {
  /**
   * Extract session token from request.
   *
   * Checks in order:
   * 1. Authorization header (Bearer token)
   * 2. Cookie (better-auth.session_token)
   *
   * @param request Express request
   * @returns Session token or null if not found
   */
  extractSessionToken(request: Request): string | null {
    // Check Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Check cookies (better-auth default cookie name)
    if (request.cookies?.['better-auth.session_token']) {
      return request.cookies['better-auth.session_token'];
    }

    return null;
  }

  /**
   * Check if session token appears valid (exists and has length).
   *
   * @param token Session token
   * @returns true if token appears valid
   */
  isValidToken(token: string | null | undefined): boolean {
    return !!(token && token.length > 0);
  }
}
