import { IsString, IsOptional, IsNotEmpty, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CloneTemplateDto {
  @ApiProperty({ description: "新模板名称", example: "OKR评估模板 - 副本" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: "新模板描述", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: "是否设为默认模板",
    example: false,
    required: false,
  })
  @IsOptional()
  is_default?: boolean;
}
