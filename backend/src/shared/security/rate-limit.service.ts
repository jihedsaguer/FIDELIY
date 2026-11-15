import { Injectable, OnModuleDestroy } from "@nestjs/common";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

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
@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private attempts: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  private readonly MAX_ATTEMPTS = 10;
  private readonly WINDOW_MS = 10 * 60 * 1000;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  check(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
    if (!ip) {
      return { allowed: false, remaining: 0, resetTime: 0 };
    }

    const now = Date.now();
    let entry = this.attempts.get(ip);

    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.WINDOW_MS,
      };
      this.attempts.set(ip, entry);
    }

    const allowed = entry.count < this.MAX_ATTEMPTS;
    const remaining = Math.max(0, this.MAX_ATTEMPTS - entry.count);

    if (allowed) {
      entry.count += 1;
    }

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
    };
  }

  reset(ip: string): void {
    this.attempts.delete(ip);
  }

  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [ip, entry] of this.attempts.entries()) {
      if (now >= entry.resetTime) {
        this.attempts.delete(ip);
        cleaned += 1;
      }
    }
    if (cleaned > 0) {
      console.log(`[RateLimiter] Cleaned ${cleaned} expired entries`);
    }
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cleanup();
  }
}