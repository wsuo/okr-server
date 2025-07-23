import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Assessment } from "./assessment.entity";
import { User } from "./user.entity";
import { timezoneTransformer } from "../common/transformers/timezone.transformer";
import { EvaluationType, EvaluationStatus } from "../common/enums/evaluation.enum";

@Entity("evaluations")
export class Evaluation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ 
    length: 20,
    comment: "评估类型：self-自评, leader-领导评分, boss-上级评分"
  })
  type: EvaluationType;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  score: number;

  @Column({ type: "text", nullable: true })
  feedback: string;

  @Column({ type: "text", nullable: true })
  strengths: string;

  @Column({ type: "text", nullable: true })
  improvements: string;

  @Column({
    type: "json",
    nullable: true,
    comment: "详细评分数据，包含分类别、分项目的评分信息",
  })
  detailed_scores: any;

  @Column({ 
    length: 20, 
    default: EvaluationStatus.DRAFT,
    comment: "评估状态：draft-草稿, submitted-已提交"
  })
  status: EvaluationStatus;

  @Column({ 
    type: "timestamp", 
    nullable: true,
    transformer: timezoneTransformer
  })
  submitted_at: Date;

  @CreateDateColumn({
    transformer: timezoneTransformer
  })
  created_at: Date;

  @UpdateDateColumn({
    transformer: timezoneTransformer
  })
  updated_at: Date;

  @ManyToOne(() => Assessment)
  @JoinColumn({ name: "assessment_id" })
  assessment: Assessment;

  @ManyToOne(() => User)
  @JoinColumn({ name: "evaluator_id" })
  evaluator: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: "evaluatee_id" })
  evaluatee: User;
}
