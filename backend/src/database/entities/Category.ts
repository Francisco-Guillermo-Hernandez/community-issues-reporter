import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryColumn()
  id!: number;

  @Column({
    type: 'varchar',
    name: 'category',
  })
  category!: string;
}
