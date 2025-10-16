import { UserRepository, IUserRepository } from '~/database/repositories/user.repository';
import { DatabaseConnection } from '~/database/dataSource';
import { UserService } from '~/services/user.service';

export class UserFactory {
  static createUserRepository(): IUserRepository {
    const dataSource = DatabaseConnection.getDataSource();
    return new UserRepository(dataSource);
  }

  static createUserService(): UserService {
    const userRepository = this.createUserRepository();
    return new UserService(userRepository);
  }
}