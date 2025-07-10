import {
  IsString,
  IsOptional,
  IsObject,
  IsIn,
  IsNotEmpty,
  MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateTemplateDto {
  @ApiProperty({ description: "模板名称", example: "OKR评估模板" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: "模板描述", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: "模板类型",
    enum: ["okr", "assessment", "evaluation"],
    example: "okr",
  })
  @IsString()
  @IsIn(["okr", "assessment", "evaluation"])
  type: string;

  @ApiProperty({
    description: "模板配置",
    example: {
      fields: [
        { name: "objective", type: "text", required: true },
        { name: "keyResults", type: "array", required: true },
      ],
    },
  })
  @IsObject()
  config: any;

  @ApiProperty({
    description: "是否默认模板",
    example: false,
    required: false,
  })
  @IsOptional()
  is_default?: boolean;
}
