import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, Max, Min } from "class-validator";

export class DefaultBossScoreDto {
  @ApiPropertyOptional({
    description: "老板默认评分（0~100），默认 90",
    example: 90,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;
}

