"use strict";
/**
 * Better Auth Schema Diagnostic
 *
 * This file tests the Better Auth adapter configuration to identify
 * the exact schema mismatch.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const better_auth_1 = require("better-auth");
const plugins_1 = require("better-auth/plugins");
const drizzle_1 = require("better-auth/adapters/drizzle");
const schema = __importStar(require("../../database/schema"));
const pg_1 = require("pg");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: '.env' });
async function diagnose() {
    const pool = new pg_1.Pool({
        connectionString: process.env.DATABASE_URL,
    });
    const db = (0, node_postgres_1.drizzle)(pool);
    console.log('=== Better Auth Configuration Diagnostic ===\n');
    // Step 1: Check the Drizzle schema object keys
    console.log('1. Schema export keys:');
    Object.keys(schema).forEach(key => {
        console.log(`   - ${key}`);
    });
    // Step 2: Check what Better Auth adapter expects
    console.log('\n2. Initializing Better Auth with current config:');
    try {
        const auth = (0, better_auth_1.betterAuth)({
            database: (0, drizzle_1.drizzleAdapter)(db, {
                provider: 'pg',
                usePlural: true,
                schema: schema,
            }),
            secret: process.env.BETTER_AUTH_SECRET,
            emailAndPassword: {
                enabled: true,
            },
            plugins: [
                (0, plugins_1.phoneNumber)({
                    sendOTP: async ({ phoneNumber, code }) => {
                        // Keep the diagnostic provider silent; OTP values must not enter logs.
                    },
                    signUpOnVerification: {
                        getTempEmail: (phoneNumber) => `${phoneNumber}@fideliy.local`,
                        getTempName: (phoneNumber) => phoneNumber,
                    },
                }),
            ],
            user: {
                modelName: 'users',
            },
            advanced: {
                database: {
                    joins: true,
                },
            },
            trustHost: true,
            sessions: {
                expiresIn: 7 * 24 * 60 * 60,
                updateAge: 24 * 60 * 60,
                cookieCache: {
                    enabled: true,
                    maxAge: 5 * 60 * 1000,
                },
            },
            csrf: {
                enabled: true,
            },
            rateLimit: {
                enabled: true,
                window: 15 * 60 * 1000,
                max: 100,
            },
        });
        console.log('✅ Better Auth initialized successfully');
    }
    catch (error) {
        console.error('❌ Better Auth initialization failed:', error);
    }
    // Step 3: Check database tables
    console.log('\n3. Physical database tables:');
    const tableResult = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
    tableResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
    });
    await pool.end();
}
diagnose().catch(console.error);
//# sourceMappingURL=better-auth-diagnostic.js.map