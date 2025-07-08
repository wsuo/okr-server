import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryUsersDto {
  @ApiProperty({ description: '页码', example: 1, required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number;

  @ApiProperty({ description: '每页数量', example: 10, required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number;

  @ApiProperty({ description: '部门ID', example: 1, required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  department_id?: number;

  @ApiProperty({ description: '角色', example: 'employee', required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ description: '搜索关键词', example: '张三', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}