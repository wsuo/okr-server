import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Assessment } from './assessment.entity';

@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 20 })
  type: string;

  @Column({ type: 'json' })
  config: any;

  @Column({ type: 'tinyint', default: 0 })
  is_default: number;

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => Assessment, (assessment) => assessment.template)
  assessments: Assessment[];
}