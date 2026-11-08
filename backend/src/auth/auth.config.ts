import 'dotenv/config';
import type { BetterAuthOptions } from 'better-auth';
import { expo } from '@better-auth/expo';

export const frontendOrigins = (
  process.env.FRONTEND_ORIGINS ?? 'http://localhost:8081'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Origines de l'app mobile : scheme de l'app + Expo Go (dev uniquement)
const mobileOrigins = [
  'myapp://',
  ...(process.env.NODE_ENV !== 'production'
    ? ['exp://', 'exp://**', 'exp://192.168.*.*:*/**']
    : []),
];

export const authOptions = {
  trustedOrigins: [...frontendOrigins, ...mobileOrigins],
  plugins: [expo()],
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