import { DatabaseConnection } from '~/database/dataSource';
import { Severity } from '~/database/entities/Severity';

export async function seedSeverity(): Promise<void> {

  const LambdaDataSource =  DatabaseConnection;
  await LambdaDataSource.initialize();
  
  const repo = LambdaDataSource.getDataSource().getRepository(Severity);
  const entries = [ 'low', 'medium', 'high', 'critical' ];
  const samples: Array<Severity> = entries.map((c, i) => ({ id: i + 1, severity: c }));

  try {
    const idsToDelete: Array<number> = samples.map(c => c.id, []);
    await repo.delete(idsToDelete);

    const records = samples.map(status => repo.create(status));
    await repo.save(records);
    
    console.log('Successfully seeded');
  } catch (error) {
    console.error('Error seeding reports:', error);
  }
}

if (require.main === module) {
  seedSeverity().then(() => process.exit(0));
}
