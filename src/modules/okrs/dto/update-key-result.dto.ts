import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  Min,
  Max,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateKeyResultDto {
  @ApiProperty({ description: "关键结果标题", required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: "详细描述", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: "目标值", required: false })
  @IsString()
  @IsOptional()
  target_value?: string;

  @ApiProperty({ description: "当前值", required: false })
  @IsString()
  @IsOptional()
  current_value?: string;

  @ApiProperty({ description: "单位", required: false })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ description: "完成进度（百分比）", required: false })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;

  @ApiProperty({ description: "权重（百分比）", required: false })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  weight?: number;

  @ApiProperty({
    description: "状态",
    enum: ["active", "completed", "cancelled"],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(["active", "completed", "cancelled"])
  status?: string;
}
