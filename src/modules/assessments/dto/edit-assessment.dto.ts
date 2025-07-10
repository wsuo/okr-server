import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsInt,
  ValidateIf,
} from "class-validator";

export class EditAssessmentDto {
  @ApiProperty({ description: "考核标题", required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: "考核周期", required: false })
  @IsString()
  @IsOptional()
  period?: string;

  @ApiProperty({ description: "考核说明", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: "开始日期", required: false })
  @IsDateString()
  @IsOptional()
  start_date?: string;

  @ApiProperty({ description: "结束日期", required: false })
  @IsDateString()
  @IsOptional()
  end_date?: string;

  @ApiProperty({ description: "截止日期", required: false })
  @IsDateString()
  @IsOptional()
  deadline?: string;

  @ApiProperty({ description: "模板ID", required: false })
  @IsInt()
  @IsOptional()
  template_id?: number;

  @ApiProperty({
    description: "参与者用户ID列表",
    type: [Number],
    required: false,
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  participant_ids?: number[];
}
