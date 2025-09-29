import { IReportRepository } from '~/database/repositories/report.repository';
import { Report } from '~/database/entities/Report';
import { GenericPaginator } from '~/common/types';

export class ReportService {
  constructor(private readonly reportRepository: IReportRepository) {}

  async saveReport(reportData: Partial<Report>): Promise<Report> {
    const newReport = this.reportRepository.create(reportData);
    return await this.reportRepository.save(newReport);
  }

  async getReportById(id: string): Promise<Report | null> {
    return await this.reportRepository.findOne({ id });
  }

  async getAllReports(filters: Record<string, string> | undefined): Promise<GenericPaginator<Report>> {
    return await this.reportRepository.find(filters);
  }

  async findByMultiple(reports: Array<string>): Promise<Array<Report>> {
    const data = await this.reportRepository.findByMultiple(reports)
    return data && data?.length> 0? data?.filter(f => f !== undefined) : [];
  }
}
