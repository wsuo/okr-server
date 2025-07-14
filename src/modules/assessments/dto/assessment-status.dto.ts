import { ApiProperty } from "@nestjs/swagger";

export class AssessmentStatusCheckResult {
  @ApiProperty({ 
    description: "是否还能进行评分操作", 
    example: true 
  })
  canEvaluate: boolean;

  @ApiProperty({ 
    description: "考核当前状态", 
    enum: ["draft", "active", "completed", "ended"],
    example: "active" 
  })
  status: string;

  @ApiProperty({ 
    description: "考核是否已结束", 
    example: false 
  })
  isEnded: boolean;

  @ApiProperty({ 
    description: "状态描述信息", 
    example: "考核正在进行中",
    required: false 
  })
  message?: string;
}