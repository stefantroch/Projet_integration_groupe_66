import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { PostgresDialect } from 'kysely';
import { authOptions } from './auth.config.js';

export const auth = betterAuth({
  ...authOptions,
  database: {
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: process.env.DATABASE_URL,
      }),
    }),
    type: 'postgres',
  },
});
