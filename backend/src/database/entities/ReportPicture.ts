import { 
  Entity, 
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  PrimaryColumn
} from 'typeorm';

import { Report } from './Report';
import { User } from './User';

@Entity('report_pictures')
export class ReportPicture {


  @PrimaryColumn()
  id!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false
  })
  key!: string;

  @Column({
    type: 'varchar',
    length: 512,
    nullable: true
  })
  url?: string;

  @Column({
    type: 'varchar',
    length: 512,
    nullable: true
  })
  previewUrl?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false
  })
  fileName!: string;

  @Column({
    type: 'boolean',
    default: false
  })
  validated!: boolean;

  @Column({
    type: 'boolean',
    default: false
  })
  validatedByUsers!: boolean;

  @CreateDateColumn({ 
    type: 'timestamptz',
    name: 'created_at'
  })
  createdAt!: Date;

  @Column({
    type: 'timestamptz',
    name: 'registered_at'
  })
  registeredAt!: Date;

  // Relationship with Report
  @ManyToOne(() => Report, report => report.pictures)
  @JoinColumn({ name: 'report_id' })
  report!: Report;

  @Column({
    type: 'uuid',
    name: 'report_id',
    nullable: false
  })
  reportId!: string;

  @ManyToOne(() => User, user => user.reportPictures)
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy?: User;

  @Column({
    type: 'uuid',
    name: 'uploaded_by',
    nullable: true
  })
  uploadedById?: string;

  @Column({
    type: 'timestamptz',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP'
  })
  updatedAt!: Date;
}
