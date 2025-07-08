import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Template } from './template.entity';
import { AssessmentParticipant } from './assessment-participant.entity';
import { Okr } from './okr.entity';
import { Evaluation } from './evaluation.entity';

@Entity('assessments')
export class Assessment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  title: string;

  @Column({ length: 20, unique: true })
  period: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date' })
  end_date: Date;

  @Column({ type: 'date' })
  deadline: Date;

  @Column({ length: 20, default: 'draft' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @ManyToOne(() => Template, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template: Template;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => AssessmentParticipant, (participant) => participant.assessment)
  participants: AssessmentParticipant[];

  @OneToMany(() => Okr, (okr) => okr.assessment)
  okrs: Okr[];

  @OneToMany(() => Evaluation, (evaluation) => evaluation.assessment)
  evaluations: Evaluation[];
}