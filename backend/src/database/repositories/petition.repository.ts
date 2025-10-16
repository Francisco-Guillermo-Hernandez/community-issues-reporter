import { Repository, FindOptionsWhere } from 'typeorm';
import { GenericPaginator } from '~/common/types';
import { toNum } from '~/common/utils';
import { Petition } from '../entities/Petition';

export interface IPetitionRepository {
  create(petitionData: Partial<Petition>): Petition;
  save(petition: Petition): Promise<Petition>;
  findOne(where: FindOptionsWhere<Petition>): Promise<Petition | null>;
  find(filters: Record<string, string> | undefined): Promise<GenericPaginator<Petition>>;
  delete(id: string): Promise<void>;
}

export class PetitionRepository implements IPetitionRepository {
  private readonly petitionRepository: Repository<Petition>;

  constructor(private readonly dataSource: any) {
    this.petitionRepository = dataSource.getRepository(Petition);
  }

  create(petitionData: Partial<Petition>): Petition {
    return this.petitionRepository.create(petitionData);
  }

  async save(petition: Petition): Promise<Petition> {
    return await this.petitionRepository.save(petition);
  }

  async findOne(where: FindOptionsWhere<Petition>): Promise<Petition | null> {
    return await this.petitionRepository.findOne({ where });
  }

  async find(filters: Record<string, string> | undefined): Promise<GenericPaginator<Petition>> {
    let page: number = 1;

    if (filters?.page)
      page = toNum(filters.page);

    const limit: number = 8;
    const actualLimit = Math.min(Math.max(limit, 1), 10);
    const actualPage = Math.max(page, 1);
    const skip = (actualPage - 1) * actualLimit;
    
    const whereCondition: { [key: string]: unknown } = {};
    
    if (filters?.status)
      whereCondition.statusId = toNum(filters?.status);

    if (filters?.category)
      whereCondition.categoryId = toNum(filters?.category);    
    
    // Exclude disabled petitions
    whereCondition.disabled = false;

    const [data, total] = await this.petitionRepository.findAndCount({ 
      where: whereCondition, 
      skip,
      take: actualLimit,
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

  async delete(id: string): Promise<void> {
    await this.petitionRepository.update(id, { 
      disabled: true,
      updatedAt: new Date()
    });
  }
}
