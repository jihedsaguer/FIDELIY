import { Injectable } from '@nestjs/common';

/**
 * Phase 1A: App Service
 *
 * Provides basic health and info endpoints for Phase 1A initialization.
 */
@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      phase: 'Phase 1A - Infrastructure & Auth Integration',
    };
  }

  getInfo() {
    return {
      app: 'FIDELIY Loyalty Platform',
      phase: 'Phase 1A',
      status: 'initializing',
    };
  }
}
