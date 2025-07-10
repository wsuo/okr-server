import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from "typeorm";
import { Department } from "./department.entity";
import { Role } from "./role.entity";
import { Assessment } from "./assessment.entity";
import { AssessmentParticipant } from "./assessment-participant.entity";
import { Okr } from "./okr.entity";
import { Evaluation } from "./evaluation.entity";
import { Template } from "./template.entity";
import { timezoneTransformer } from "../common/transformers/timezone.transformer";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  username: string;

  @Column({ length: 255 })
  password: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, unique: true, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  avatar: string;

  @Column({ type: "tinyint", default: 1 })
  status: number;

  @Column({ type: "date", nullable: true })
  join_date: Date;

  @Column({ length: 100, nullable: true })
  position: string;

  @Column({ nullable: true })
  department_id: number;

  @Column({ nullable: true })
  leader_id: number;

  @CreateDateColumn({
    transformer: timezoneTransformer
  })
  created_at: Date;

  @UpdateDateColumn({
    transformer: timezoneTransformer
  })
  updated_at: Date;

  @DeleteDateColumn({
    transformer: timezoneTransformer
  })
  deleted_at: Date;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: "department_id" })
  department: Department;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "leader_id" })
  leader: User;

  @OneToMany(() => User, (user) => user.leader)
  subordinates: User[];

  @ManyToMany(() => Role)
  @JoinTable({
    name: "user_roles",
    joinColumn: { name: "user_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "role_id", referencedColumnName: "id" },
  })
  roles: Role[];

  @OneToMany(() => Assessment, (assessment) => assessment.creator)
  createdAssessments: Assessment[];

  @OneToMany(() => AssessmentParticipant, (participant) => participant.user)
  assessmentParticipants: AssessmentParticipant[];

  @OneToMany(() => Okr, (okr) => okr.user)
  okrs: Okr[];

  @OneToMany(() => Evaluation, (evaluation) => evaluation.evaluator)
  evaluationsGiven: Evaluation[];

  @OneToMany(() => Evaluation, (evaluation) => evaluation.evaluatee)
  evaluationsReceived: Evaluation[];

  @OneToMany(() => Template, (template) => template.creator)
  createdTemplates: Template[];
}
