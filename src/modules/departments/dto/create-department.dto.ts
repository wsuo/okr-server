import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  Length,
  Min,
  Max,
} from "class-validator";

export class CreateDepartmentDto {
  @ApiProperty({ description: "部门名称", example: "技术部" })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @ApiProperty({
    description: "部门描述",
    example: "负责技术研发工作",
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: "父部门ID", example: 1, required: false })
  @IsNumber()
  @IsOptional()
  parent_id?: number;

  @ApiProperty({ description: "排序", example: 0, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(9999)
  sort_order?: number;
}
