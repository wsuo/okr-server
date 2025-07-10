import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { CreateKeyResultDto } from "./create-key-result.dto";

export class CreateOkrDto {
  @ApiProperty({ description: "用户ID" })
  @IsNumber()
  user_id: number;

  @ApiProperty({ description: "考核ID" })
  @IsNumber()
  assessment_id: number;

  @ApiProperty({ description: "目标描述", example: "提升前端开发效率" })
  @IsString()
  @IsNotEmpty()
  objective: string;

  @ApiProperty({ description: "目标详细说明", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: "权重（百分比）", example: 100.0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  weight?: number = 100.0;

  @ApiProperty({ description: "关键结果列表", type: [CreateKeyResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateKeyResultDto)
  key_results: CreateKeyResultDto[];
}
