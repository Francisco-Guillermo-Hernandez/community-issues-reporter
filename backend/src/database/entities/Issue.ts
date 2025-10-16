import { 
  Entity, 
  PrimaryColumn,
  Column, 
} from 'typeorm';


@Entity('Issues')
export class Issue {
  @PrimaryColumn()
  id!: number; 

  @Column({
    type: 'varchar',
    name: 'issue'
  })
  issue!: string;

}