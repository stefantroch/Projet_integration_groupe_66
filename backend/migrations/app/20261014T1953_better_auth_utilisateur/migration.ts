#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/dcf143cda7452e7774d557f2e3bac38590b347a54bd52e00de71a58410933757/contract';
import endContract from '../../snapshots/dcf143cda7452e7774d557f2e3bac38590b347a54bd52e00de71a58410933757/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f467bcde8a171b524b4fe58f13ac607a3845ea8bc9d976c7f11a3efa048984b7/contract';
import startContract from '../../snapshots/f467bcde8a171b524b4fe58f13ac607a3845ea8bc9d976c7f11a3efa048984b7/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  rawSql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      rawSql({
        id: 'unifyBetterAuthUtilisateur',
        label: 'Unify the empty legacy authentication schema with Utilisateur',
        operationClass: 'destructive',
        target: {
          id: 'postgres',
          details: {
            schema: 'public',
            objectType: 'table',
            name: 'Utilisateur',
          },
        },
        precheck: [],
        execute: [
          {
            description:
              'Refuse populated authentication tables, then install the shared schema',
            sql: `
DO $$
DECLARE
  table_name text;
  has_rows boolean;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['Utilisateur', 'user', 'session', 'account', 'verification'] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE', table_name);
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)', table_name) INTO has_rows;
      IF has_rows THEN
        RAISE EXCEPTION 'Authentication migration requires empty tables; % contains data. Migrate existing accounts before continuing.', table_name;
      END IF;
    END IF;
  END LOOP;
END $$;

DROP TABLE IF EXISTS public."session", public."account", public."verification";
DROP TABLE IF EXISTS public."user";

-- A rename preserves the primary key, sequence and animal/trophy foreign keys.
ALTER TABLE public."Utilisateur" RENAME COLUMN "idUtilisateur" TO "id";
ALTER TABLE public."Utilisateur"
  DROP COLUMN "mdpHash",
  ADD COLUMN "emailVerified" boolean NOT NULL DEFAULT false,
  ADD COLUMN "image" text,
  ADD COLUMN "dateModification" timestamptz NOT NULL DEFAULT now();

CREATE TABLE public."session" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL REFERENCES public."Utilisateur" ("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text
);
CREATE INDEX "session_userId_idx_a489d58a" ON public."session" ("userId");

CREATE TABLE public."account" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL REFERENCES public."Utilisateur" ("id") ON DELETE CASCADE,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "password" text,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "account_userId_idx_a489d58a" ON public."account" ("userId");

CREATE TABLE public."verification" (
  "id" serial PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "verification_identifier_idx_79a0dbb3" ON public."verification" ("identifier");
`,
          },
        ],
        postcheck: [
          {
            description: 'The old user table must be gone',
            sql: `SELECT to_regclass('public."user"') IS NULL AS result`,
          },
          {
            description: 'Utilisateur must be keyed by id and the auth tables must exist',
            sql: `SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Utilisateur' AND column_name = 'id'
) AND to_regclass('public."session"') IS NOT NULL AS result`,
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
