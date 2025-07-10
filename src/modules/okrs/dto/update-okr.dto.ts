import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  Min,
  Max,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateOkrDto {
  @ApiProperty({ description: "目标描述", required: false })
  @IsString()
  @IsOptional()
  objective?: string;

  @ApiProperty({ description: "目标详细说明", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: "权重（百分比）", required: false })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  weight?: number;

  @ApiProperty({ description: "完成进度（百分比）", required: false })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;

  @ApiProperty({
    description: "状态",
    enum: ["active", "completed", "cancelled"],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(["active", "completed", "cancelled"])
  status?: string;

  @ApiProperty({ description: "自评等级（1-5）", required: false })
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  self_rating?: number;

  @ApiProperty({ description: "领导评分等级（1-5）", required: false })
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  leader_rating?: number;
}
