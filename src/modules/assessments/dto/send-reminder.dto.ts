import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
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
}
