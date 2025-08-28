import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnablePgcrypto1700000000001 implements MigrationInterface {
  name = 'EnablePgcrypto1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  }

  public down(queryRunner: QueryRunner): Promise<void> {
    // Do not drop extension blindly as it may be used by other objects
    // Provide a safe down that is a no-op by issuing a harmless query
    return queryRunner
      .query('/* no-op down for pgcrypto */ SELECT 1')
      .then(() => undefined);
  }
}
