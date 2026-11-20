import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __vhProdPgPool: Pool | undefined;
}

export function getDbPool(): Pool {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error('DATABASE_URL chưa được cấu hình trên Vercel.');
  }
  if (!global.__vhProdPgPool) {
    global.__vhProdPgPool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
    });
  }
  return global.__vhProdPgPool;
}
