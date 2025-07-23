import { IsString, IsOptional, IsIn, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { EvaluationType, EvaluationStatus } from "../../../common/enums/evaluation.enum";

export class QueryEvaluationsDto {
  @ApiProperty({ description: "页码", example: 1, required: false })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: "每页数量", example: 10, required: false })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({ description: "考核ID", required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  assessment_id?: number;

  @ApiProperty({ description: "被评估人ID", required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  evaluatee_id?: number;

  @ApiProperty({ description: "评估人ID", required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  evaluator_id?: number;

  @ApiProperty({
    description: "评估类型",
    enum: ["self", "leader", "boss"],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(["self", "leader", "boss"])
  type?: EvaluationType;

  @ApiProperty({
    description: "评估状态",
    enum: ["draft", "submitted"],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(["draft", "submitted"])
  status?: EvaluationStatus;
}
