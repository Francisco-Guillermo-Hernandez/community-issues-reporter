import { ReportRepository, IReportRepository } from '~/database/repositories/report.repository';
import { DatabaseConnection } from '~/database/dataSource';
import { ReportService } from '~/services/report.service';

/**
 * @description
 */
export class ReportFactory {
  static createReportRepository(): IReportRepository {
    const dataSource = DatabaseConnection.getDataSource();
    return new ReportRepository(dataSource);
  }

  /**
   * @description
   * @returns 
   */
  static createReportService(): ReportService {
    const reportRepository = this.createReportRepository();
    return new ReportService(reportRepository);
  }
}
