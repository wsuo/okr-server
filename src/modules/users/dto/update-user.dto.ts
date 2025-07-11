import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  Length,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
} from "class-validator";

export class UpdateUserDto {
  @ApiProperty({ description: "真实姓名", example: "张三" })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @ApiProperty({
    description: "邮箱",
    example: "zhangsan@example.com",
    required: false,
  })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: "电话", example: "13800138000", required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: "职位", example: "前端工程师", required: false })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiProperty({ description: "部门ID", example: 1, required: false })
  @IsNumber()
  @IsOptional()
  department_id?: number;

  @ApiProperty({ description: "直属领导ID", example: 3, required: false })
  @IsNumber()
  @IsOptional()
  leader_id?: number;

  @ApiProperty({ description: "角色ID列表", example: [4] })
  @IsArray()
  @IsNumber({}, { each: true })
  role_ids: number[];

  @ApiProperty({
    description: "入职日期",
    example: "2023-03-15",
    required: false,
  })
  @IsDateString()
  @IsOptional()
  join_date?: string;
}