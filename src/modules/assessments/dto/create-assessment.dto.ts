import { IsString, IsNotEmpty, IsDateString, IsOptional, IsArray, IsNumber, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAssessmentDto {
  @ApiProperty({ description: '考核标题', example: '2025年7月绩效考核' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  title: string;

  @ApiProperty({ description: '考核周期（YYYY-MM）', example: '2025-07' })
  @IsString()
  @IsNotEmpty()
  @Length(7, 7)
  period: string;

  @ApiProperty({ description: '考核说明', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '开始日期', example: '2025-07-01' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: '结束日期', example: '2025-07-31' })
  @IsDateString()
  end_date: string;

  @ApiProperty({ description: '提交截止日期', example: '2025-08-05' })
  @IsDateString()
  deadline: string;

  @ApiProperty({ description: '模板ID', required: false })
  @IsNumber()
  @IsOptional()
  template_id?: number;

  @ApiProperty({ description: '参与者用户ID列表', type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  participant_ids: number[];
}