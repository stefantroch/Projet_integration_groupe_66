#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/627360f09f3abf8a9c7d5725f4784c8db3747ca130941faee3b3246cb45a14c4/contract';
import endContract from '../../snapshots/627360f09f3abf8a9c7d5725f4784c8db3747ca130941faee3b3246cb45a14c4/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/dcf143cda7452e7774d557f2e3bac38590b347a54bd52e00de71a58410933757/contract';
import startContract from '../../snapshots/dcf143cda7452e7774d557f2e3bac38590b347a54bd52e00de71a58410933757/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropColumn({ schema: 'public', table: 'Animal', column: 'idZoo' }),
      this.createTable({
        schema: 'public',
        table: 'Capture',
        columns: [
          col('cheminPhoto', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('dateCapture', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('idAnimal', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('idCapture', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('idUtilisateur', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('score', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
        ],
        constraints: [primaryKey(['idCapture'])],
      }),
      // Table Animal vide : la colonne peut être créée directement NOT NULL (pas de backfill).
      this.addColumn({
        schema: 'public',
        table: 'Animal',
        column: col('cleModele', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
      }),
      // Table Animal vide : la colonne peut être créée directement NOT NULL (pas de backfill).
      this.addColumn({
        schema: 'public',
        table: 'Animal',
        column: col('nomScientifique', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
      }),
      // Table Animal vide : la colonne peut être créée directement NOT NULL (pas de backfill).
      this.addColumn({
        schema: 'public',
        table: 'Animal',
        column: col('numero', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'Animal',
        constraint: 'Animal_cleModele_key',
        columns: ['cleModele'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Animal',
        constraint: 'Animal_numero_key',
        columns: ['numero'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Capture',
        index: 'Capture_idAnimal_idx_7cf4df29',
        columns: ['idAnimal'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Capture',
        index: 'Capture_idUtilisateur_idAnimal_idx_aed493f1',
        columns: ['idUtilisateur', 'idAnimal'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Capture',
        index: 'Capture_idUtilisateur_idx_384e96e2',
        columns: ['idUtilisateur'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Capture',
        foreignKey: {
          name: 'Capture_idUtilisateur_fkey',
          columns: ['idUtilisateur'],
          references: { schema: 'public', table: 'Utilisateur', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Capture',
        foreignKey: {
          name: 'Capture_idAnimal_fkey',
          columns: ['idAnimal'],
          references: { schema: 'public', table: 'Animal', columns: ['idAnimal'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
