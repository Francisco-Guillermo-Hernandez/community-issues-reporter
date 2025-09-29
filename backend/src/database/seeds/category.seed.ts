import { DatabaseConnection } from '~/database/dataSource';
import { Category } from '~/database/entities/Category';

export async function seedCategory(): Promise<void> {

  const LambdaDataSource = DatabaseConnection;
  await LambdaDataSource.initialize();
  
  const repo = LambdaDataSource.getDataSource().getRepository(Category);
  const entries = [ 'prevention', 'corrective', 'replacement', 'construction', 'removal', 'installation', 'inspection', 'emergency' ];
  const samples: Array<Category> = entries.map((c, i) => ({ id: i + 1, category: c }));

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
  seedCategory().then(() => process.exit(0));
}
