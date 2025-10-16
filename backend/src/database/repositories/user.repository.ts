import { User } from '~/database/entities/User';
import { FindOptionsWhere, Repository } from 'typeorm';

export interface IUserRepository {
  findOne(where: FindOptionsWhere<User>): Promise<User | null>;
  create(userData: Partial<User>): User;
  save(user: User): Promise<User>;
  update(id: string, userData: Partial<User>): Promise<void>;
}

export class UserRepository implements IUserRepository {
  private readonly userRepository: Repository<User>;

  constructor(private readonly dataSource: any) {
    this.userRepository = dataSource.getRepository(User);
  }

  public async findOne(where: FindOptionsWhere<User>): Promise<User | null> {
    return await this.userRepository.findOne({ where });
  }

  public create(userData: Partial<User>): User {
    return this.userRepository.create(userData);
  }

  public async save(user: User): Promise<User> {
    return await this.userRepository.save(user);
  }

  public async update(id: string, userData: Partial<User>): Promise<void> {
    await this.userRepository.update(id, userData);
  }
}