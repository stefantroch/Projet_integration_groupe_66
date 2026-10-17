#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/91e7f9f035806fa2789a4d726ef7724cad434fd6b00014d47ebf12d6e6bb784e/contract';
import startContract from '../../snapshots/91e7f9f035806fa2789a4d726ef7724cad434fd6b00014d47ebf12d6e6bb784e/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f467bcde8a171b524b4fe58f13ac607a3845ea8bc9d976c7f11a3efa048984b7/contract';
import endContract from '../../snapshots/f467bcde8a171b524b4fe58f13ac607a3845ea8bc9d976c7f11a3efa048984b7/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropTable({ schema: 'public', table: 'Post' }),
      this.dropTable({ schema: 'public', table: 'User' }),
      this.createTable({
        schema: 'public',
        table: 'Animal',
        columns: [
          col('alimentation', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('famille', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('habitat', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('idAnimal', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('idZoo', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('imageFiche', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nom', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['idAnimal'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'AnimalDebloque',
        columns: [
          col('dateDeblocage', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('idAnimal', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('idUtilisateur', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['idUtilisateur', 'idAnimal'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Trophee',
        columns: [
          col('conditionObtention', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('icone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('idTrophee', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nom', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['idTrophee'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'TropheeUtilisateur',
        columns: [
          col('dateObtention', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('idTrophee', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('idUtilisateur', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['idUtilisateur', 'idTrophee'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Utilisateur',
        columns: [
          col('dateCreation', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('idUtilisateur', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('mdpHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('pseudo', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['idUtilisateur'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Utilisateur',
        constraint: 'Utilisateur_pseudo_key',
        columns: ['pseudo'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Utilisateur',
        constraint: 'Utilisateur_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AnimalDebloque',
        index: 'AnimalDebloque_idAnimal_idx_7cf4df29',
        columns: ['idAnimal'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AnimalDebloque',
        index: 'AnimalDebloque_idUtilisateur_idx_384e96e2',
        columns: ['idUtilisateur'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TropheeUtilisateur',
        index: 'TropheeUtilisateur_idTrophee_idx_f7014787',
        columns: ['idTrophee'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TropheeUtilisateur',
        index: 'TropheeUtilisateur_idUtilisateur_idx_384e96e2',
        columns: ['idUtilisateur'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AnimalDebloque',
        foreignKey: {
          name: 'AnimalDebloque_idUtilisateur_fkey',
          columns: ['idUtilisateur'],
          references: { schema: 'public', table: 'Utilisateur', columns: ['idUtilisateur'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AnimalDebloque',
        foreignKey: {
          name: 'AnimalDebloque_idAnimal_fkey',
          columns: ['idAnimal'],
          references: { schema: 'public', table: 'Animal', columns: ['idAnimal'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TropheeUtilisateur',
        foreignKey: {
          name: 'TropheeUtilisateur_idUtilisateur_fkey',
          columns: ['idUtilisateur'],
          references: { schema: 'public', table: 'Utilisateur', columns: ['idUtilisateur'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TropheeUtilisateur',
        foreignKey: {
          name: 'TropheeUtilisateur_idTrophee_fkey',
          columns: ['idTrophee'],
          references: { schema: 'public', table: 'Trophee', columns: ['idTrophee'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
