import { SignPetitionRepository, ISignPetitionRepository } from '~/database/repositories/signPetition.repository';
import { DatabaseConnection } from '~/database/dataSource';
import { SignPetitionService } from '~/services/signPetition.service';

export class SignPetitionFactory {
  static createSignPetitionRepository(): ISignPetitionRepository {
    const dataSource = DatabaseConnection.getDataSource();
    return new SignPetitionRepository(dataSource);
  }

  static createSignPetitionService(): SignPetitionService {
    const signPetitionRepository = this.createSignPetitionRepository();
    return new SignPetitionService(signPetitionRepository);
  }
}