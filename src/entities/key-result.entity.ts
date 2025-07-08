import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Okr } from './okr.entity';

@Entity('key_results')
export class KeyResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 100, nullable: true })
  target_value: string;

  @Column({ length: 100, nullable: true })
  current_value: string;

  @Column({ length: 20, nullable: true })
  unit: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.00 })
  progress: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 100.00 })
  weight: number;

  @Column({ length: 20, default: 'active' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Okr)
  @JoinColumn({ name: 'okr_id' })
  okr: Okr;
}