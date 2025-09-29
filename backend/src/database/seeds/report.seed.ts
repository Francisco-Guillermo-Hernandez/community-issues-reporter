import { DatabaseConnection } from '~/database/dataSource';
import { Report } from '~/database/entities/Report';
import { getSeverityLevelIndex, getPotholeStatusIndex, getIssueTypeIndex } from '~/common/getMapTypes';

export async function seedReports() {

  const LambdaDataSource =  DatabaseConnection
  await LambdaDataSource.initialize();
  const reportRepository = LambdaDataSource.getDataSource().getRepository(Report);
  const sampleReports: Partial<Report>[] = [
    {
      coordinate: JSON.stringify([40.7128, -74.0060]),
      address: "New York, NY",
      description: "Pothole on main street causing vehicle damage",
      severityId: getSeverityLevelIndex('high'),
      statusId: getPotholeStatusIndex('reported'),
      issueTypeId: getIssueTypeIndex('potholes'),
      reportedAt: new Date('2023-05-15T10:30:00Z'),
      cellIndex: "CELL_001"
    },
    {
      coordinate: JSON.stringify([34.0522, -118.2437]),
      address: "Los Angeles, CA",
      description: "Burned out street lamp on Sunset Blvd",
      severityId: getSeverityLevelIndex('medium'),
      statusId: getPotholeStatusIndex('confirmed'),
      issueTypeId: getIssueTypeIndex('burned_out_lamps'),
      reportedAt: new Date('2023-05-16T14:15:00Z'),
      cellIndex: "CELL_002"
    },
    {
      coordinate: JSON.stringify([41.8781, -87.6298]),
      address: "Chicago, IL",
      description: "Sewer lid missing near downtown area",
      severityId: getSeverityLevelIndex('low'),
      statusId: getPotholeStatusIndex('in_progress'),
      issueTypeId: getIssueTypeIndex('sewer_lids'),
      reportedAt: new Date('2023-05-17T09:45:00Z'),
      cellIndex: "CELL_003"
    },
    {
      coordinate: JSON.stringify([29.7604, -95.3698]),
      address: "Houston, TX",
      description: "Traffic light not working at intersection",
      severityId: getSeverityLevelIndex('critical'),
      statusId: getPotholeStatusIndex('fixed'),
      issueTypeId: getIssueTypeIndex('burned_out_semaphores'),
      reportedAt: new Date('2023-05-18T16:20:00Z'),
      cellIndex: "CELL_004"
    },
    {
      coordinate: JSON.stringify([33.4484, -112.0740]),
      address: "Phoenix, AZ",
      description: "Multiple potholes in residential area",
      severityId: getSeverityLevelIndex('high'),
      statusId: getPotholeStatusIndex('reported'),
      issueTypeId: getIssueTypeIndex('potholes'),
      reportedAt: new Date('2023-05-19T11:00:00Z'),
      cellIndex: "CELL_005"
    }
  ];

  try {
    // Clear existing data
    // await reportRepository.delete({});

    // Insert sample reports
    const reportsToInsert = sampleReports.map(report => 
      reportRepository.create({
        ...report,
        // coordinate: JSON.stringify(report.coordinate)
      })
    );

    await reportRepository.save(reportsToInsert);
    
    console.log('Successfully seeded reports database');
  } catch (error) {
    console.error('Error seeding reports:', error);
  }
}

// Run seed when executed directly
if (require.main === module) {
  seedReports().then(() => process.exit(0));
}
