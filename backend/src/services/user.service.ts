import { IUserRepository } from '~/database/repositories/user.repository';
import { User } from '~/database/entities/User';

export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async createUser(userData: Partial<User>): Promise<User> {
    const newUser = this.userRepository.create(userData);
    return await this.userRepository.save(newUser);
  }

  async getUserById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({ id });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ email });
  }

  async updateUser(id: string, userData: Partial<User>): Promise<void> {
    await this.userRepository.update(id, userData);
  }
}