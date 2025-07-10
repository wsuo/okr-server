import { IsString, IsOptional, IsIn, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class QueryTemplatesDto {
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

  @ApiProperty({ description: "模板名称", required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: "模板类型",
    enum: ["okr", "assessment", "evaluation"],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(["okr", "assessment", "evaluation"])
  type?: string;

  @ApiProperty({
    description: "模板状态",
    enum: [0, 1],
    required: false,
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @IsIn([0, 1])
  status?: number;

  @ApiProperty({
    description: "是否默认模板",
    enum: [0, 1],
    required: false,
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @IsIn([0, 1])
  is_default?: number;

  @ApiProperty({ description: "创建者ID", required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  created_by?: number;
}
