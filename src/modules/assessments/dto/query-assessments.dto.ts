import { IsString, IsOptional, IsIn, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class QueryAssessmentsDto {
  @ApiProperty({ description: '页码', example: 1, required: false })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: '每页数量', example: 10, required: false })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({ 
    description: '考核状态', 
    enum: ['draft', 'active', 'completed', 'ended'],
    required: false 
  })
  @IsString()
  @IsOptional()
  @IsIn(['draft', 'active', 'completed', 'ended'])
  status?: string;

  @ApiProperty({ description: '考核周期', example: '2025-07', required: false })
  @IsString()
  @IsOptional()
  period?: string;

  @ApiProperty({ description: '搜索关键词', required: false })
  @IsString()
  @IsOptional()
  search?: string;
}