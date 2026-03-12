import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class SendReminderDto {
  @ApiProperty({
    description: "需要提醒的参与人 user id 列表",
    type: [Number],
    example: [7, 8],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  participant_ids: number[];

  @ApiPropertyOptional({
    description: "自定义邮件标题",
    example: "[OKR系统] 自定义提交提醒",
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    description: "自定义 HTML 模板，可使用 Handlebars 占位符",
    example: "<div>{{recipientName}} / {{assessmentTitle}}</div>",
  })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional({
    description: "自定义模板上下文，会与默认 reminder context 合并",
    example: { customNote: "请尽快处理" },
    type: Object,
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
