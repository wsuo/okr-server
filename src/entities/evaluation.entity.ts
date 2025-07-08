import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Assessment } from './assessment.entity';
import { User } from './user.entity';

@Entity('evaluations')
export class Evaluation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  type: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  score: number;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @Column({ type: 'text', nullable: true })
  strengths: string;

  @Column({ type: 'text', nullable: true })
  improvements: string;

  @Column({ length: 20, default: 'draft' })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  submitted_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Assessment)
  @JoinColumn({ name: 'assessment_id' })
  assessment: Assessment;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'evaluator_id' })
  evaluator: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'evaluatee_id' })
  evaluatee: User;
}