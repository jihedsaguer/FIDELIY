import { OnModuleDestroy } from "@nestjs/common";
/**
 * Simple in-memory IP-based rate limiter.
 * Tracks requests per IP address: 10 attempts per 10 minutes.
 *
 * Design:
 * - MVP Phase 1 only: suitable for single-instance deployment
 * - State is NOT shared across instances or server restarts
 * - Cleanup runs on module destroy to prevent unbounded memory growth
 *
 * Limitations & Future Upgrade Path:
 * - Multi-instance: Each instance has independent rate limit state
 *   If load-balanced, attackers can distribute requests across instances.
 *   Solution (Phase 2): Move to Redis or distributed cache (ZSET by IP).
 * - Server restart: Limits reset (state lost). For MVP, acceptable.
 * - No persistence: Memory-only. Suitable for MVP rate limiting on single server.
 */
export declare class RateLimitService implements OnModuleDestroy {
    private attempts;
    private cleanupInterval;
    private readonly MAX_ATTEMPTS;
    private readonly WINDOW_MS;
    constructor();
    check(ip: string): {
        allowed: boolean;
        remaining: number;
        resetTime: number;
    };
    reset(ip: string): void;
    cleanup(): void;
    onModuleDestroy(): void;
}
//# sourceMappingURL=rate-limit.service.d.ts.map