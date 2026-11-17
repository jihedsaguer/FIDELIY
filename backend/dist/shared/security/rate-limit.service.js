"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitService = void 0;
const common_1 = require("@nestjs/common");
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
let RateLimitService = class RateLimitService {
    constructor() {
        this.attempts = new Map();
        this.cleanupInterval = null;
        this.MAX_ATTEMPTS = 10;
        this.WINDOW_MS = 10 * 60 * 1000;
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }
    check(ip) {
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
    reset(ip) {
        this.attempts.delete(ip);
    }
    cleanup() {
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
    onModuleDestroy() {
        if (this.cleanupInterval !== null) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.cleanup();
    }
};
exports.RateLimitService = RateLimitService;
exports.RateLimitService = RateLimitService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RateLimitService);
//# sourceMappingURL=rate-limit.service.js.map