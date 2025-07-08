import { PartialType } from '@nestjs/swagger';
import { CreateDepartmentDto } from './create-department.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {
  @ApiProperty({ 
    description: '部门状态', 
    example: 1,
    enum: [0, 1],
    required: false 
  })
  @IsOptional()
  @IsIn([0, 1])
  status?: number;
}