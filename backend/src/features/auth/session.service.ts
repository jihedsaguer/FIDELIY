import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class SessionService {
  extractCookieHeader(request: Request): string | null {
    return request.headers.cookie || null;
  }

  isValidToken(token: string | null | undefined): boolean {
    return !!(token && token.length > 0);
  }
}
