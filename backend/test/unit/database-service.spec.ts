/**
 * DatabaseService pool resilience (no database required).
 *
 * Uses a real pg Pool pointed at a closed local port: onModuleInit fails on
 * the connection test, but the pool it created is inspected afterwards.
 */
import { DatabaseService } from '../../src/database/database.service';

describe('DatabaseService pool', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let service: DatabaseService;

  beforeAll(async () => {
    originalEnv = { ...process.env };
    process.env.DATABASE_URL = 'postgresql://nobody:nothing@127.0.0.1:1/none';
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    service = new DatabaseService();
    await expect(service.onModuleInit()).rejects.toBeDefined();
  });

  afterAll(async () => {
    await service.getPool().end();
    jest.restoreAllMocks();
    process.env = originalEnv;
  });

  it('waits up to 10 seconds for a connection (Neon cold start)', () => {
    expect((service.getPool() as any).options.connectionTimeoutMillis).toBe(10000);
  });

  it('logs idle-client errors instead of crashing the process', () => {
    const pool = service.getPool();
    expect(() => pool.emit('error', new Error('terminating connection'))).not.toThrow();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('pool'),
      expect.any(Error),
    );
  });
});
