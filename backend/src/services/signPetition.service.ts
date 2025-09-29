import { ISignPetitionRepository } from '~/database/repositories/signPetition.repository';
import { SignPetition } from '~/database/entities/SignPetition';
import { GenericPaginator } from '~/common/types';

export class SignPetitionService {
  constructor(private readonly signPetitionRepository: ISignPetitionRepository) {}

  async signPetition(signPetitionData: Partial<SignPetition>): Promise<SignPetition> {
    const newSignPetition = this.signPetitionRepository.create(signPetitionData);
    return await this.signPetitionRepository.save(newSignPetition);
  }

  async getSignPetitionById(id: string): Promise<SignPetition | null> {
    return await this.signPetitionRepository.findOne({ id });
  }

  async getSignPetitionsByFilters(filters: Record<string, string> | undefined): Promise<GenericPaginator<SignPetition>> {
    return await this.signPetitionRepository.find(filters);
  }

  async countSignaturesByPetitionId(petitionId: string): Promise<number> {
    return await this.signPetitionRepository.countByPetitionId(petitionId);
  }

  async checkIfUserAlreadySigned(petitionId: string, userId: string): Promise<boolean> {
    const existingSignature = await this.signPetitionRepository.findOne({
      petitionId,
      signedById: userId
    });
    return !!existingSignature;
  }
}