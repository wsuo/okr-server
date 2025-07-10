import {
  IsNumber,
  IsString,
  IsOptional,
  IsIn,
  Min,
  Max,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateEvaluationDto {
  @ApiProperty({ description: "评分", required: false })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;

  @ApiProperty({ description: "反馈意见", required: false })
  @IsString()
  @IsOptional()
  feedback?: string;

  @ApiProperty({ description: "优势", required: false })
  @IsString()
  @IsOptional()
  strengths?: string;

  @ApiProperty({ description: "改进建议", required: false })
  @IsString()
  @IsOptional()
  improvements?: string;

  @ApiProperty({
    description: "评估状态",
    enum: ["draft", "submitted"],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(["draft", "submitted"])
  status?: string;
}
