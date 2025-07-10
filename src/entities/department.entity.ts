import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity("departments")
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ nullable: true })
  parent_id: number;

  @Column({ default: 0 })
  sort_order: number;

  @Column({ type: "tinyint", default: 1 })
  status: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: "parent_id" })
  parent: Department;

  @OneToMany(() => Department, (department) => department.parent)
  children: Department[];

  @OneToMany(() => User, (user) => user.department)
  employees: User[];
}
