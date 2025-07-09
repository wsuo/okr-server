import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Assessment } from './assessment.entity';
import { User } from './user.entity';

@Entity('assessment_participants')
export class AssessmentParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'tinyint', default: 0 })
  self_completed: number;

  @Column({ type: 'tinyint', default: 0 })
  leader_completed: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  self_score: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  leader_score: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  final_score: number;

  @Column({ type: 'timestamp', nullable: true })
  self_submitted_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  leader_submitted_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @ManyToOne(() => Assessment)
  @JoinColumn({ name: 'assessment_id' })
  assessment: Assessment;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}