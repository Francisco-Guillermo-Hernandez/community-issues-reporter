import { SignPetition } from '~/database/entities/SignPetition';
import { FindOptionsWhere, Repository } from 'typeorm';
import { GenericPaginator } from '~/common/types';
import { toNum } from '~/common/utils';

export interface ISignPetitionRepository {
  findOne(where: FindOptionsWhere<SignPetition>): Promise<SignPetition | null>;
  find(filters: Record<string, string> | undefined): Promise<GenericPaginator<SignPetition>>;
  countByPetitionId(petitionId: string): Promise<number>;
  create(signPetitionData: Partial<SignPetition>): SignPetition;
  save(signPetition: SignPetition): Promise<SignPetition>;
}

export class SignPetitionRepository implements ISignPetitionRepository {
  private readonly signPetitionRepository: Repository<SignPetition>;

  constructor(private readonly dataSource: any) {
    this.signPetitionRepository = dataSource.getRepository(SignPetition);
  }

  async findOne(where: FindOptionsWhere<SignPetition>): Promise<SignPetition | null> {
    return await this.signPetitionRepository.findOne({ 
      where,
      relations: ['petition', 'signedBy']
    });
  }

  async find(filters: Record<string, string> | undefined): Promise<GenericPaginator<SignPetition>> {
    let page: number = 1;

    if (filters?.page)
      page = toNum(filters.page);

    const limit: number = 8;
    const actualLimit = Math.min(Math.max(limit, 1), 10);
    const actualPage = Math.max(page, 1);
    const skip = (actualPage - 1) * actualLimit;
    const whereCondition: { [key: string]: unknown } = {};
    
    if (filters?.signedById)
      whereCondition.signedById = filters.signedById;
      
    if (filters?.petitionId)
      whereCondition.petitionId = filters.petitionId;

    if (filters?.youAreAffectedDirectly !== undefined)
      whereCondition.youAreAffectedDirectly = filters.youAreAffectedDirectly === 'true';

    if (filters?.youAreAffectedIndirectly !== undefined)
      whereCondition.youAreAffectedIndirectly = filters.youAreAffectedIndirectly === 'true';
    
    const [data, total] = await this.signPetitionRepository.findAndCount({ 
      where: whereCondition, 
      skip,
      take: actualLimit,
      select: {
        id: true,
        petitionId: true,
        signedById: true,
        youAreAffectedDirectly: true,
        youAreAffectedIndirectly: true,
        signDate: true
      },
      relations: ['petition', 'signedBy'],
      order: {
        signDate: 'DESC'
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

  async countByPetitionId(petitionId: string): Promise<number> {
    return await this.signPetitionRepository.count({ 
      where: { petitionId } 
    });
  }

  create(signPetitionData: Partial<SignPetition>): SignPetition {
    return this.signPetitionRepository.create(signPetitionData);
  }

  async save(signPetition: SignPetition): Promise<SignPetition> {
    return await this.signPetitionRepository.save(signPetition);
  }
}