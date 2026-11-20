import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __vhPgPool: Pool | undefined;
}

export function getDbPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!global.__vhPgPool) {
    global.__vhPgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return global.__vhPgPool;
}
