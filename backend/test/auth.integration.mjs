import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { Pool } from 'pg';
import { PostgresDialect } from 'kysely';
import { betterAuth } from 'better-auth';
import postgres from '@prisma/orm-postgres/runtime';
import contractJson from '../src/prisma/contract.json' with { type: 'json' };
import { authOptions, frontendOrigins } from '../src/auth/auth.config.ts';

const migrationPath = 'migrations/app/20261014T1953_better_auth_utilisateur';

await test('migration, shared user, password login, session and game relations', async () => {
  assert.ok(
    process.env.DATABASE_URL,
    'DATABASE_URL must point to a local test PostgreSQL server',
  );
  const databaseName = `auth_test_${randomUUID().replaceAll('-', '')}`;
  const fixtureUrl = new URL(process.env.DATABASE_URL);
  fixtureUrl.pathname = `/${databaseName}`;
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  let fixture;
  let db;

  function migrate(to) {
    const result = spawnSync(
      process.execPath,
      [
        'node_modules/prisma/dist/prisma.js',
        'db',
        'migrate',
        '--to',
        to,
        '--yes',
        '--confirm',
        'backend',
      ],
      {
        env: { ...process.env, DATABASE_URL: fixtureUrl.toString() },
        encoding: 'utf8',
      },
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }

  try {
    // All writes use a newly created database, never the configured application database.
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    fixture = new Pool({ connectionString: fixtureUrl.toString() });
    migrate('f467bcde8a171b524b4fe58f13ac607a3845ea8bc9d976c7f11a3efa048984b7');
    await fixture.query(
      await readFile(
        'better-auth_migrations/2026-10-14T14-10-33.076Z.sql',
        'utf8',
      ),
    );

    const ops = JSON.parse(await readFile(`${migrationPath}/ops.json`, 'utf8'));
    async function expectMigrationRefusal() {
      const client = await fixture.connect();
      try {
        await client.query('BEGIN');
        await assert.rejects(
          client.query(ops[0].execute[0].sql),
          /requires empty tables/,
        );
      } finally {
        await client.query('ROLLBACK');
        client.release();
      }
      assert.equal(
        (
          await fixture.query(
            `SELECT to_regclass('public."user"') IS NOT NULL AS present`,
          )
        ).rows[0].present,
        true,
      );
    }

    await fixture.query(
      `INSERT INTO "Utilisateur" ("pseudo", "email", "mdpHash") VALUES ('legacy', 'legacy@example.com', 'legacy-hash')`,
    );
    await expectMigrationRefusal();
    assert.equal(
      (await fixture.query('SELECT "mdpHash" FROM "Utilisateur"')).rows[0]
        .mdpHash,
      'legacy-hash',
    );
    await fixture.query('DELETE FROM "Utilisateur"');
    await fixture.query(
      `INSERT INTO "user" ("id", "name", "email", "emailVerified") VALUES ('legacy-auth', 'legacy', 'legacy@example.com', false)`,
    );
    await expectMigrationRefusal();
    assert.equal(
      (await fixture.query('SELECT count(*)::int AS count FROM "user"')).rows[0]
        .count,
      1,
    );
    await fixture.query('DELETE FROM "user"');
    migrate('20261014T1953_better_auth_utilisateur');

    const testAuth = betterAuth({
      ...authOptions,
      baseURL: 'http://localhost:3000',
      secret: randomUUID() + randomUUID(),
      database: {
        dialect: new PostgresDialect({ pool: fixture }),
        type: 'postgres',
      },
    });
    db = postgres({ contractJson, url: fixtureUrl.toString() });
    const credentials = {
      email: 'integration@example.com',
      password: 'Integration-test-123!',
    };
    const signup = await testAuth.api.signUpEmail({
      body: { ...credentials, name: 'integration' },
    });
    const user = await db.orm.public.Utilisateur.where({
      email: credentials.email,
    }).first();
    assert.ok(user);
    assert.equal(String(user.idUtilisateur), signup.user.id);
    assert.equal(user.pseudo, 'integration');
    assert.equal('mdpHash' in user, false);
    assert.equal(
      (
        await fixture.query(
          `SELECT to_regclass('public."user"') IS NULL AS absent`,
        )
      ).rows[0].absent,
      true,
    );
    const account = (
      await fixture.query('SELECT "userId", "password" FROM "account"')
    ).rows[0];
    assert.equal(account.userId, user.idUtilisateur);
    assert.notEqual(account.password, credentials.password);

    await assert.rejects(
      testAuth.api.signInEmail({
        body: { ...credentials, password: 'wrong-password' },
      }),
    );
    const login = await testAuth.api.signInEmail({ body: credentials });
    assert.equal(login.user.id, signup.user.id);
    // Use the signed cookie actually returned by the HTTP handler.
    const rejectedResponse = await testAuth.handler(
      new Request('http://localhost:3000/api/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://untrusted.example',
        },
        body: JSON.stringify(credentials),
      }),
    );
    assert.equal(rejectedResponse.status, 403);
    const response = await testAuth.handler(
      new Request('http://localhost:3000/api/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: frontendOrigins[0],
        },
        body: JSON.stringify(credentials),
      }),
    );
    assert.equal(response.status, 200);
    const cookies = response.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ');
    const headers = new Headers({ cookie: cookies });
    const session = await testAuth.api.getSession({ headers });
    assert.equal(session.user.id, signup.user.id);

    const animal = (
      await fixture.query(
        `INSERT INTO "Animal" ("idZoo", "nom", "famille", "habitat", "alimentation", "description", "imageFiche") VALUES (1, 'Lion', 'Felidae', 'Savane', 'Carnivore', 'Test', 'lion.png') RETURNING "idAnimal"`,
      )
    ).rows[0];
    const trophy = (
      await fixture.query(
        `INSERT INTO "Trophee" ("nom", "description", "conditionObtention", "icone") VALUES ('Premier animal', 'Test', 'Test', 'test.png') RETURNING "idTrophee"`,
      )
    ).rows[0];
    await fixture.query(
      'INSERT INTO "AnimalDebloque" ("idUtilisateur", "idAnimal") VALUES ($1, $2)',
      [user.idUtilisateur, animal.idAnimal],
    );
    await fixture.query(
      'INSERT INTO "TropheeUtilisateur" ("idUtilisateur", "idTrophee") VALUES ($1, $2)',
      [user.idUtilisateur, trophy.idTrophee],
    );
    const profile = await db.orm.public.Utilisateur.where({
      idUtilisateur: user.idUtilisateur,
    })
      .include('animauxDebloques')
      .include('trophees')
      .first();
    assert.equal(profile.animauxDebloques.length, 1);
    assert.equal(profile.trophees.length, 1);
    await testAuth.api.signOut({ headers });
    assert.equal(await testAuth.api.getSession({ headers }), null);
  } finally {
    await db?.close();
    await fixture?.end();
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin.end();
  }
});
