import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('service_taxonomies')
@Index(['serviceType', 'type', 'name'], { unique: true })
@Index(['serviceType'])
@Index(['type'])
export class ServiceTaxonomy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, default: 'technology' })
  serviceType: string;

  @Column({ type: 'varchar', length: 50 })
  type: string; // 'category' | 'subcategory' | 'skill'

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  parentCategory: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
