import { DatabaseConnection } from '~/database/dataSource';
import { User } from '~/database/entities/User';

export async function seedReports() {

  const LambdaDataSource =  DatabaseConnection;
  await LambdaDataSource.initialize();
  
  const repo = LambdaDataSource.getDataSource().getRepository(User);
  const samples: Partial<User>[] = [
    {
      email: 'demo@gmail.com',
      googleSub: 'demoDemoDemo'
    },
  ];

  try {
    // await repo.delete([1, ]);
    const records = samples.map(status => repo.create(status));

    await repo.save(records);
    
    console.log('Successfully seeded records');
  } catch (error) {
    console.error('Error seeding records:', error);
  }
}

if (require.main === module) {
  seedReports().then(() => process.exit(0));
}
