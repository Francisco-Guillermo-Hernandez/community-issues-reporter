import { DatabaseConnection } from '~/database/dataSource';
import { Issue } from '~/database/entities/Issue';

export async function seedIssues(): Promise<void> {

  const LambdaDataSource =  DatabaseConnection;
  await LambdaDataSource.initialize();
  
  const repo = LambdaDataSource.getDataSource().getRepository(Issue);
  const entries = [ 'potholes', 'burned_out_lamps', 'burned_out_semaphores', 'sewer_lids' ];
  const samples: Array<Issue> = entries.map((c, i) => ({ id: i + 1, issue: c }));
  
  try {
    const idsToDelete: Array<number> = samples.map(c => c.id, []);
    await repo.delete(idsToDelete);

    const records = samples.map(status => repo.create(status));
    await repo.save(records);
    
    console.log('Successfully seeded');
  } catch (error) {
    console.error('Error seeding:', error);
  }
}

if (require.main === module) {
  seedIssues().then(() => process.exit(0));
}
