import { Report } from '~/database/entities/Report';
import { FindOptionsWhere, Repository, In } from 'typeorm';
import { GenericPaginator } from '~/common/types';
import { toNum } from '~/common/utils';

export interface IReportRepository {
  findOne(where: FindOptionsWhere<Report>): Promise<Report | null>;
  find(filters: Record<string, string> | undefined): Promise<GenericPaginator<Report>>;
  findByMultiple(reportIds: Array<string>): Promise<Array<Report> | null>;
  create(reportData: Partial<Report>): Report;
  save(report: Report): Promise<Report>;
  delete(id: string): Promise<void>;
}

export class ReportRepository implements IReportRepository {
  private readonly reportRepository: Repository<Report>;

  constructor(private readonly dataSource: any) {
    this.reportRepository = dataSource.getRepository(Report);
  }

  async findOne(where: FindOptionsWhere<Report>): Promise<Report | null> {
    return await this.reportRepository.createQueryBuilder('report')
    .leftJoinAndSelect('report.pictures', 'pictures')
    .leftJoinAndSelect('report.reportedBy', 'reportedBy')
    .select([
      'report.coordinate',
      'report.address',
      'report.description',
      'report.severityId',
      'report.statusId',
      'report.issueTypeId',
      'report.reportedAt',
      'report.cellIndex',
      'reportedBy.name',
      'pictures.id',
      'pictures.key',
      'pictures.validated',
      'pictures.previewUrl',
      'pictures.url',
    ])
    .where(where)
    .getOne();   
  }

  async find(filters: Record<string, string> | undefined): Promise<GenericPaginator<Report>> {
    
    let page: number = 1;

    if (filters?.page)
      page = toNum(filters.page);

    const limit: number = 8;
    const actualLimit = Math.min(Math.max(limit, 1), 10);
    const actualPage = Math.max(page, 1);
    const skip = (actualPage - 1) * actualLimit;
    const whereCondition: { [key: string]: unknown } = {};
    
    if (filters?.severity)
      whereCondition.severityId = toNum(filters?.severity);
      
    if (filters?.status)
      whereCondition.statusId = toNum(filters?.status);

    if (filters?.issueType)
      whereCondition.issueTypeId = toNum(filters?.issueType);    
    
    const [data, total] = await this.reportRepository.findAndCount({ 
      where: whereCondition, 
      skip,
      take: actualLimit,
      select: {
        id: true,
        coordinate: true,
        address: true,
        description: true,
        severityId: true,
        statusId: true,
        issueTypeId: true,
        reportedAt: true
      },
      order: {
        createdAt: 'DESC'
      }
    });
    const totalPages = Math.ceil(total / actualLimit);

    return {
      data,
      total,
      page: actualPage,
      totalPages,
      hasNext: actualPage < totalPages,
      hasPrev: actualPage > 1,
    };
  }

  async findByMultiple(reports: Array<string>): Promise<Array<Report> | null> {
    return await this.reportRepository.find({ where: { id: In(reports) } })
  }
  create(reportData: Partial<Report>): Report {
    return this.reportRepository.create(reportData);
  }

  async save(report: Report): Promise<Report> {
    return await this.reportRepository.save(report);
  }

  async delete(id: string): Promise<void> {
    await this.reportRepository.delete(id);
  }
  
}
