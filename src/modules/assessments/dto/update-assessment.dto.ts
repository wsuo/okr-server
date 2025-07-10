import { PartialType } from "@nestjs/swagger";
import { CreateAssessmentDto } from "./create-assessment.dto";
import { IsString, IsOptional, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateAssessmentDto extends PartialType(CreateAssessmentDto) {
  @ApiProperty({
    description: "考核状态",
    enum: ["draft", "active", "completed", "ended"],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(["draft", "active", "completed", "ended"])
  status?: string;
}
