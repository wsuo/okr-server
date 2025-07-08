import { IsString, IsOptional, IsObject, IsIn, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTemplateDto {
  @ApiProperty({ description: '模板名称', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: '模板描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    description: '模板类型', 
    enum: ['okr', 'assessment', 'evaluation'],
    required: false 
  })
  @IsString()
  @IsOptional()
  @IsIn(['okr', 'assessment', 'evaluation'])
  type?: string;

  @ApiProperty({ 
    description: '模板配置', 
    required: false 
  })
  @IsObject()
  @IsOptional()
  config?: any;

  @ApiProperty({ 
    description: '是否默认模板', 
    required: false 
  })
  @IsOptional()
  is_default?: boolean;

  @ApiProperty({ 
    description: '模板状态', 
    enum: [0, 1],
    required: false 
  })
  @IsNumber()
  @IsOptional()
  @IsIn([0, 1])
  status?: number;
}