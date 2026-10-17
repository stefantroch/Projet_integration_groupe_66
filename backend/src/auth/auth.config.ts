import 'dotenv/config';
import type { BetterAuthOptions } from 'better-auth';

export const frontendOrigins = (
  process.env.FRONTEND_ORIGINS ?? 'http://localhost:8081'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const authOptions = {
  trustedOrigins: frontendOrigins,
  user: {
    modelName: 'Utilisateur',
    fields: {
      name: 'pseudo',
      createdAt: 'dateCreation',
      updatedAt: 'dateModification',
    },
  },
  advanced: {
    database: {
      generateId: 'serial',
    },
  },
  emailAndPassword: {
    enabled: true,
  },
} satisfies BetterAuthOptions;
