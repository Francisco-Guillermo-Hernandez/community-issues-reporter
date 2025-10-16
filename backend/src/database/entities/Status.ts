import { 
  Entity, 
  PrimaryColumn,
  Column, 
} from 'typeorm';

 
@Entity('statuses')
export class Status {
  @PrimaryColumn()
  id!: number; 

  @Column({
    type: 'varchar',
    name: 'status'
  })
  status!: string;

}