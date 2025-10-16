import { PetitionRepository, IPetitionRepository } from '~/database/repositories/petition.repository';
import { DatabaseConnection } from '~/database/dataSource';
import { PetitionService } from '~/services/petition.service';

/**
 * @description
 */
export class PetitionFactory {
  static createReportRepository(): IPetitionRepository {
    const dataSource = DatabaseConnection.getDataSource();
    return new PetitionRepository(dataSource);
  }

  /**
   * @description
   * @returns 
   */
  static createPetitionService(): PetitionService {
    const reportRepository = this.createReportRepository();
    return new PetitionService(reportRepository);
  }
}
