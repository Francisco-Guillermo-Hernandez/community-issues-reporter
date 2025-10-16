import { 
  PrimaryGeneratedColumn,
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Petition } from './Petition';
import { User } from './User';

@Entity('sign_petitions') 
export class SignPetition {

    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Petition, petition => petition.singPetitions)
    @JoinColumn({ name: 'petition_id' })
    petition!: Petition;

    @Column({
        type: 'uuid',
        name: 'petition_id',
        nullable: false
    })
    petitionId!: string;

    @ManyToOne(() => User, user => user.signedPetitions)
    @JoinColumn({ name: 'signed_by' })
    signedBy!: User;

    @Column({
        type: 'uuid',
        name: 'signed_by',
        nullable: false
    })
    signedById!: string;

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
    youAreAffectedDirectly!: boolean;

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
    youAreAffectedIndirectly!: boolean;

    @Column({
        type: 'timestamptz',
        name: 'sign_date',
        default: () => 'CURRENT_TIMESTAMP'
    })
    signDate!: Date;

}