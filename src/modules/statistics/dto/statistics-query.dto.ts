import {
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class StatisticsQueryDto {
  @ApiProperty({
    description: "开始日期",
    required: false,
    example: "2024-01-01",
  })
  @IsDateString()
  @IsOptional()
  start_date?: string;

  @ApiProperty({
    description: "结束日期",
    required: false,
    example: "2024-12-31",
  })
  @IsDateString()
  @IsOptional()
  end_date?: string;

  @ApiProperty({ description: "部门ID", required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  department_id?: number;

  @ApiProperty({ description: "用户ID", required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  user_id?: number;

  @ApiProperty({ description: "考核ID", required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  assessment_id?: number;

  @ApiProperty({
    description: "时间维度",
    enum: ["day", "week", "month", "quarter", "year"],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(["day", "week", "month", "quarter", "year"])
  time_dimension?: string;

  @ApiProperty({
    description: "分组维度",
    enum: ["department", "user", "assessment", "time"],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(["department", "user", "assessment", "time"])
  group_by?: string;
}
