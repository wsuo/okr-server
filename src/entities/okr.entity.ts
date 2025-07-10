import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
import { Assessment } from "./assessment.entity";
import { KeyResult } from "./key-result.entity";

@Entity("okrs")
export class Okr {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text" })
  objective: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 100.0 })
  weight: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0.0 })
  progress: number;

  @Column({ length: 20, default: "active" })
  status: string;

  @Column({ type: "tinyint", nullable: true })
  self_rating: number;

  @Column({ type: "tinyint", nullable: true })
  leader_rating: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Assessment)
  @JoinColumn({ name: "assessment_id" })
  assessment: Assessment;

  @OneToMany(() => KeyResult, (keyResult) => keyResult.okr)
  keyResults: KeyResult[];
}
