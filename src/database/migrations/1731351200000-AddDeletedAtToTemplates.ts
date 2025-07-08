import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDeletedAtToTemplates1731351200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'templates',
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamp',
        isNullable: true,
        default: null,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('templates', 'deleted_at');
  }
}