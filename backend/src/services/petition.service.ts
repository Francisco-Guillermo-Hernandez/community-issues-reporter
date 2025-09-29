import { Petition } from '~/database/entities/Petition';
import { IPetitionRepository } from '~/database/repositories/petition.repository';

export interface IPetitionService {
  create(petitionData: Partial<Petition>): Promise<Petition>;
  findOne(id: string): Promise<Petition | null>;
  find(filters?: Record<string, string>): Promise<any>;
  delete(id: string): Promise<void>;
}

export class PetitionService implements IPetitionService {
  constructor(private readonly petitionRepository: IPetitionRepository) {}

  async create(petitionData: Partial<Petition>): Promise<Petition> {
    const petition = this.petitionRepository.create(petitionData);
    return await this.petitionRepository.save(petition);
  }

  async findOne(id: string): Promise<Petition | null> {
    return await this.petitionRepository.findOne({ id });
  }

  async find(filters?: Record<string, string>): Promise<any> {
    return await this.petitionRepository.find(filters);
  }

  async delete(id: string): Promise<void> {
    return await this.petitionRepository.delete(id);
  }
}
