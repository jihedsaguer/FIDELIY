/**
 * Phase 1A: App Service
 *
 * Provides basic health and info endpoints for Phase 1A initialization.
 */
export declare class AppService {
    getHealth(): {
        status: string;
        timestamp: string;
        phase: string;
    };
    getInfo(): {
        app: string;
        phase: string;
        status: string;
    };
}
//# sourceMappingURL=app.service.d.ts.map