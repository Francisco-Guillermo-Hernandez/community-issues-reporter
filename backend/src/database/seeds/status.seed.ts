import { DatabaseConnection } from '~/database/dataSource';
import { Status } from '~/database/entities/Status';

export async function seedStatuses(): Promise<void> {

  const LambdaDataSource =  DatabaseConnection;
  await LambdaDataSource.initialize();
  
  const repo = LambdaDataSource.getDataSource().getRepository(Status);

  const entries = [ 'reported', 'confirmed', 'in_progress', 'fixed', 'petition_to_sign', 'signed' ];
  const samples: Array<Status> = entries.map((c, i) => ({ id: i + 1, status: c }));

  try {
    const idsToDelete: Array<number> = samples.map(c => c.id, []);
    await repo.delete(idsToDelete);

    const records = samples.map(status => repo.create(status));
    await repo.save(records);
    
    console.log('Successfully seeded statuses');
  } catch (error) {
    console.error('Error seeding reports:', error);
  }
}

if (require.main === module) {
  seedStatuses().then(() => process.exit(0));
}
