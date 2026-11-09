import 'dotenv/config';
import type { BetterAuthOptions } from 'better-auth';
import { APIError } from 'better-auth/api';

export const frontendOrigins = (
  process.env.FRONTEND_ORIGINS ?? 'http://localhost:8081'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const authOptions = {
  trustedOrigins: frontendOrigins,
  session: {
    // Durée de validité du jeton : 24 heures
    expiresIn: 60 * 60 * 24,
  },
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
  //hook pour chercher l'utilisateur avec le pseudo reçu
  databaseHooks: {
    user: {
      create: {
        before: async (user, context) => {
          if (!context) return;

          const existingUser = await context.context.adapter.findOne({
            model: 'user',
            where: [
              {
                field: 'name',
                value: user.name,
              },
            ],
          });

          if (existingUser) {
            throw new APIError('UNPROCESSABLE_ENTITY', {
              code: 'PSEUDO_ALREADY_USED',
              message: 'Ce pseudo est déjà utilisé',
            });
          }
        },
      },
    },
  },
} satisfies BetterAuthOptions;
