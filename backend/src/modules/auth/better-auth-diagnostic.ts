/**
 * Better Auth Schema Diagnostic
 * 
 * This file tests the Better Auth adapter configuration to identify
 * the exact schema mismatch.
 */

import { betterAuth } from 'better-auth';
import { phoneNumber } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import * as schema from '../../database/schema';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function diagnose() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  console.log('=== Better Auth Configuration Diagnostic ===\n');
  
  // Step 1: Check the Drizzle schema object keys
  console.log('1. Schema export keys:');
  Object.keys(schema).forEach(key => {
    console.log(`   - ${key}`);
  });

  // Step 2: Check what Better Auth adapter expects
  console.log('\n2. Initializing Better Auth with current config:');
  try {
    const auth = betterAuth({
      database: drizzleAdapter(db, {
        provider: 'pg',
        usePlural: true,
        schema: schema as any,
      }),
      secret: process.env.BETTER_AUTH_SECRET!,
      emailAndPassword: {
        enabled: true,
      },
      plugins: [
        phoneNumber({
          sendOTP: async ({ phoneNumber, code }) => {
            console.log(`📱 [DEV] OTP Code: ${code} sent to ${phoneNumber}`);
          },
          signUpOnVerification: {
            getTempEmail: (phoneNumber: string) => `${phoneNumber}@fideliy.local`,
            getTempName: (phoneNumber: string) => phoneNumber,
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
  } catch (error) {
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
