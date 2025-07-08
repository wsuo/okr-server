import { IsString, IsOptional, IsIn, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class QueryOkrsDto {
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

  @ApiProperty({ description: '用户ID', required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  user_id?: number;

  @ApiProperty({ description: '考核ID', required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  assessment_id?: number;

  @ApiProperty({ 
    description: 'OKR状态', 
    enum: ['active', 'completed', 'cancelled'],
    required: false 
  })
  @IsString()
  @IsOptional()
  @IsIn(['active', 'completed', 'cancelled'])
  status?: string;

  @ApiProperty({ description: '搜索关键词', required: false })
  @IsString()
  @IsOptional()
  search?: string;
}