
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './User';
import { ReportPicture } from './ReportPicture'; 
import { Issue } from './Issue';
import { Severity } from './Severity';
import { Status } from './Status';
import { Petition } from './Petition';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    name: 'coordinate'
  })
  coordinate!: string;

  @Column({ 
    type: 'varchar', 
    length: 255,
    nullable: false
  })
  address!: string;

  @Column({ 
    type: 'text',
    nullable: false
  })
  description!: string;

  // Relationship with Severity entity
  @ManyToOne(() => Severity, severity => severity.id)
  @JoinColumn({ name: 'severity_id' })
  severity!: Severity;

  @Column({
    type: 'integer',
    name: 'severity_id',
    nullable: false
  })
  severityId!: number;

  // Relationship with Status entity
  @ManyToOne(() => Status, status => status.id)
  @JoinColumn({ name: 'status_id' })
  status!: Status;

  @Column({
    type: 'integer',
    name: 'status_id',
    nullable: false
  })
  statusId!: number;

  // Relationship with Issue entity
  @ManyToOne(() => Issue, issue => issue.id)
  @JoinColumn({ name: 'issue_type_id' })
  issueType!: Issue;

  @Column({
    type: 'integer',
    name: 'issue_type_id',
    nullable: false
  })
  issueTypeId!: number;

  @Column({
    type: 'timestamptz',
    name: 'reported_at'
  })
  reportedAt!: Date;

  @Column({ 
    type: 'varchar', 
    length: 255,
    nullable: false
  })
  cellIndex!: string;

  @Column({
    type: 'timestamptz',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP'
  })
  createdAt!: Date;

  @Column({
    type: 'timestamptz',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP'
  })
  updatedAt!: Date;

  @ManyToOne(() => User, user => user.reports)
  @JoinColumn({ name: 'reported_by' })
  reportedBy!: User;

  @Column({
    type: 'uuid',
    name: 'reported_by',
    nullable: false
  })
  reportedById!: string;

  // Relationship with ReportPicture - one report can have multiple pictures
  @OneToMany(() => ReportPicture, picture => picture.report)
  pictures!: Array<ReportPicture>;


  @ManyToOne(() => Petition, petition => petition.reports)
  @JoinColumn({ name: 'petition_id' })
  petition!: Petition;

  @Column({
    type: 'uuid',
    name: 'petition_id',
    nullable: true
  })
  petitionId!: string;
}
