import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("system_configs")
export class SystemConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  config_key: string;

  @Column({ type: "text", nullable: true })
  config_value: string;

  @Column({ length: 255, nullable: true })
  description: string;

  @Column({ length: 20, default: "string" })
  type: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
