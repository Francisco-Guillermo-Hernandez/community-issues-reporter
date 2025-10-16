import { 
  Entity, 
  PrimaryColumn,
  Column, 
} from 'typeorm';

 
@Entity('severities')
export class Severity {
  @PrimaryColumn()
  id!: number; 

  @Column({
    type: 'varchar',
    name: 'severity'
  })
  severity!: string;

}