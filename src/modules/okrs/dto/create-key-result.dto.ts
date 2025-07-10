import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  Length,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateKeyResultDto {
  @ApiProperty({ description: "关键结果标题", example: "优化构建流程" })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  title: string;

  @ApiProperty({ description: "详细描述", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: "目标值", example: "2" })
  @IsString()
  @IsOptional()
  target_value?: string;

  @ApiProperty({ description: "单位", example: "分钟", required: false })
  @IsString()
  @IsOptional()
  @Length(0, 20)
  unit?: string;

  @ApiProperty({ description: "权重（百分比）", example: 40.0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  weight: number;
}
