/**
 * Phase 1B (Corrected): SessionValidationMiddleware Unit Tests
 *
 * Tests actual use() method.
 * Middleware extracts session token, validates with Better Auth via AuthService, 
 * attaches user to request. No connection held.
 * 
 * Verifies:
 * - Session token extraction from headers
 * - Better Auth session validation via AuthService
 * - User principal attached to request
 * - No connection held (middleware pattern)
 */

import { SessionService } from '../../src/features/auth/session.service';
import { SessionValidationMiddleware } from '../../src/shared/middleware/session-validation.middleware';
import { Request, Response, NextFunction } from 'express';

describe('SessionValidationMiddleware - Session Extraction and Validation', () => {
  let middleware: SessionValidationMiddleware;
  let authService: any;
  let sessionService: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    // Create mock AuthService
    authService = {
      validateSession: jest.fn(),
    };

    // Create mock SessionService
    sessionService = {
      extractCookieHeader: jest.fn(),
    };

    // Create middleware with mocked AuthService and SessionService
    middleware = new SessionValidationMiddleware(authService, sessionService);

    // Create mocks for req/res/next
    mockRequest = {
      headers: {
        authorization: 'Bearer valid-token-123',
      },
    };

    mockResponse = {};
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('use() middleware method', () => {
    it('should invoke actual use() method and call next()', async () => {
      sessionService.extractCookieHeader.mockReturnValue('better-auth.session_token=signed-value; better-auth.session_data=cache-value');
      authService.validateSession.mockResolvedValueOnce({
        userId: 'user-123',
      });

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract session token from request headers', async () => {
      sessionService.extractCookieHeader.mockReturnValue('better-auth.session_token=signed-value; better-auth.session_data=cache-value');
      authService.validateSession.mockResolvedValueOnce({
        userId: 'user-123',
      });

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(sessionService.extractCookieHeader).toHaveBeenCalledWith(mockRequest);
    });

    it('should validate session with authService.validateSession', async () => {
      sessionService.extractCookieHeader.mockReturnValue('better-auth.session_token=signed-value; better-auth.session_data=cache-value');
      authService.validateSession.mockResolvedValueOnce({
        userId: 'user-123',
      });

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(authService.validateSession).toHaveBeenCalledWith('better-auth.session_token=signed-value; better-auth.session_data=cache-value');
    });

    it('should attach user principal to request when session is valid', async () => {
      sessionService.extractCookieHeader.mockReturnValue('better-auth.session_token=signed-value; better-auth.session_data=cache-value');
      authService.validateSession.mockResolvedValueOnce({
        userId: 'user-123',
      });

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect((mockRequest as any).user).toBeDefined();
      expect((mockRequest as any).user.id).toBe('user-123');
    });

    it('should not hold connection after middleware completes', async () => {
      sessionService.extractCookieHeader.mockReturnValue('better-auth.session_token=signed-value; better-auth.session_data=cache-value');
      authService.validateSession.mockResolvedValueOnce({
        userId: 'user-123',
      });

      const connectionBefore = (mockRequest as any).connection;

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const connectionAfter = (mockRequest as any).connection;

      // Connection should not be held by middleware
      expect(connectionAfter).toBe(connectionBefore);
      expect(connectionAfter).not.toBeDefined();
    });

    it('should call next() to pass control to next middleware', async () => {
      sessionService.extractCookieHeader.mockReturnValue('better-auth.session_token=signed-value; better-auth.session_data=cache-value');
      authService.validateSession.mockResolvedValueOnce({
        userId: 'user-123',
      });

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should handle missing token gracefully', async () => {
      sessionService.extractCookieHeader.mockReturnValue(null);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect((mockRequest as any).user).toBeUndefined();
    });

    it('should not set user when validation fails', async () => {
      sessionService.extractCookieHeader.mockReturnValue('better-auth.session_token=invalid-signature');
      authService.validateSession.mockResolvedValueOnce({
        error: 'Invalid session',
      });

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect((mockRequest as any).user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should continue to next() even if token extraction throws', async () => {
      sessionService.extractCookieHeader.mockImplementationOnce(() => {
        throw new Error('Token extraction failed');
      });

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue to next() even if validation throws', async () => {
      sessionService.extractCookieHeader.mockReturnValue('better-auth.session_token=signed-value');
      authService.validateSession.mockRejectedValueOnce(new Error('Validation error'));

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
