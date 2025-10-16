import { 
  Entity, 
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from './User';
import { Category } from './Category';
import { SignPetition } from './SignPetition';
import { Status } from './Status';
import { Report } from './Report';

@Entity('petitions') 
export class Petition {

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ 
    type: 'varchar', 
    length: 50,
    nullable: false
  })
  title!: string;

  @OneToMany(() => Report, report => report.petition)
  reports!: Array<Report>

  @Column({ 
    type: 'varchar', 
    length: 150,
    nullable: false
  })
  description!: string;

  @Column({
    type: 'integer',
    nullable: false
  })
  targetSignatures!: number;
  
  @Column({
    type: 'integer',
    nullable: false
  })
  currentSignatures!: number;


  @ManyToOne(() => Category, category => category.id)
  @JoinColumn({ name: 'category_id' })
  severity!: Category;

  @Column({
    type: 'integer',
    name: 'category_id',
    nullable: false
  })
  categoryId!: number;

  @ManyToOne(() => Status, status => status.id)
  @JoinColumn({ name: 'status_id' })
  status!: Status;
    
  @Column({
    type: 'integer',
    name: 'status_id',
    nullable: false,
    default: 5,
  })
  statusId!: number;


  @ManyToOne(() => User, user => user.reportPictures)
  @JoinColumn({ name: 'reported_by' })
  reportedBy?: User;
  
  @Column({
    type: 'uuid',
    name: 'reported_by',
    nullable: false
  })
  reportedById?: string;
    
  @OneToMany(() => SignPetition, sp => sp.petition)
  singPetitions!: Array<SignPetition>;

  @Column({
    type: 'boolean',
    nullable: false,
    default: false,
  })
  disabled!: boolean;

  @CreateDateColumn({ 
    type: 'timestamptz',
    name: 'created_at'
  })
  createdAt!: Date;

  @Column({
    type: 'timestamptz',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP'
  })
  updatedAt!: Date;
}