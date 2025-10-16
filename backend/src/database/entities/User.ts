import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

import { Report } from './Report';
import { ReportPicture } from './ReportPicture';
import { SignPetition } from './SignPetition';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  picture?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  googleSub?: string | null; // `sub` from Google id_token

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  
  
  // Relationship with Report - one user can report many reports
  @OneToMany(() => Report, report => report.reportedBy)
  reports!: Report[];

  // Relationship with ReportPicture - one user can upload many pictures
  @OneToMany(() => ReportPicture, picture => picture.uploadedBy)
  reportPictures!: ReportPicture[];

  // Relationship with SignPetition - one user can sign many petitions
  @OneToMany(() => SignPetition, signPetition => signPetition.signedBy)
  signedPetitions!: SignPetition[];
}
