import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { EvaluationsService } from "./evaluations.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CreateSelfEvaluationDto } from "./dto/create-self-evaluation.dto";
import { CreateLeaderEvaluationDto } from "./dto/create-leader-evaluation.dto";
import { UpdateEvaluationDto } from "./dto/update-evaluation.dto";
import { QueryEvaluationsDto } from "./dto/query-evaluations.dto";
import {
  CreateDetailedSelfEvaluationDto,
  CreateDetailedLeaderEvaluationDto,
  SaveEvaluationDraftDto,
  UpdateEvaluationDraftDto,
} from "./dto/detailed-score.dto";
import {
  CompleteEvaluationQueryDto,
  CompleteEvaluationResponseDto,
} from "./dto/complete-evaluation.dto";
import {
  EvaluationTemplateResponseDto,
  UserEvaluationTemplateDto,
} from "./dto/evaluation-template.dto";
import {
  EvaluationTaskDto,
  EvaluationProgressDto,
  SubordinateEvaluationTaskDto,
} from "./dto/evaluation-task.dto";

@ApiTags("评估管理")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("evaluations")
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Get()
  @ApiOperation({ summary: "获取评估列表" })
  @ApiResponse({ status: 200, description: "获取成功" })
  findAll(@Query() query: QueryEvaluationsDto) {
    return this.evaluationsService.findAll(query);
  }

  @Get("my")
  @ApiOperation({ summary: "获取我的评估记录" })
  @ApiResponse({ status: 200, description: "获取成功" })
  getMyEvaluations(
    @CurrentUser() user: any,
    @Query("assessment_id") assessmentId?: number
  ) {
    return this.evaluationsService.getMyEvaluations(user.id, assessmentId);
  }

  @Get("to-give")
  @ApiOperation({ summary: "获取需要我评分的评估" })
  @ApiResponse({ status: 200, description: "获取成功" })
  getEvaluationsToGive(
    @CurrentUser() user: any,
    @Query("assessment_id") assessmentId?: number
  ) {
    return this.evaluationsService.getEvaluationsToGive(user.id, assessmentId);
  }

  // 新增接口：任务和进度
  @Get("my-tasks")
  @ApiOperation({ summary: "获取我的评估任务列表" })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: [EvaluationTaskDto],
  })
  getMyTasks(
    @CurrentUser() user: any,
    @Query("assessment_id") assessmentId?: string
  ) {
    const parsedAssessmentId =
      assessmentId && assessmentId.trim() !== "" && !isNaN(Number(assessmentId))
        ? Number(assessmentId)
        : undefined;

    return this.evaluationsService.getMyTasks(user.id, parsedAssessmentId);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取评估详情" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 404, description: "评估记录不存在" })
  findOne(@Param("id") id: string) {
    return this.evaluationsService.findOne(+id);
  }

  @Post("self")
  @ApiOperation({ summary: "提交自评" })
  @ApiResponse({ status: 201, description: "提交成功" })
  @ApiResponse({ status: 400, description: "参数错误或业务规则错误" })
  createSelfEvaluation(
    @Body() createSelfEvaluationDto: CreateSelfEvaluationDto,
    @CurrentUser() user: any
  ) {
    return this.evaluationsService.createSelfEvaluation(
      createSelfEvaluationDto,
      user.id
    );
  }

  @Post("leader")
  @ApiOperation({ summary: "提交领导评分" })
  @ApiResponse({ status: 201, description: "提交成功" })
  @ApiResponse({ status: 400, description: "参数错误或业务规则错误" })
  createLeaderEvaluation(
    @Body() createLeaderEvaluationDto: CreateLeaderEvaluationDto,
    @CurrentUser() user: any
  ) {
    return this.evaluationsService.createLeaderEvaluation(
      createLeaderEvaluationDto,
      user.id
    );
  }

  @Put(":id")
  @ApiOperation({ summary: "更新评估" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 404, description: "评估记录不存在" })
  @ApiResponse({ status: 400, description: "已提交的评估无法修改" })
  update(
    @Param("id") id: string,
    @Body() updateEvaluationDto: UpdateEvaluationDto
  ) {
    return this.evaluationsService.update(+id, updateEvaluationDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除评估" })
  @ApiResponse({ status: 204, description: "删除成功" })
  @ApiResponse({ status: 404, description: "评估记录不存在" })
  @ApiResponse({ status: 400, description: "已提交的评估无法删除" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.evaluationsService.remove(+id);
  }

  // 新增接口：评分模板相关
  @Get("template/:assessmentId")
  @ApiOperation({ summary: "获取评分模板结构" })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: EvaluationTemplateResponseDto,
  })
  @ApiResponse({ status: 404, description: "考核不存在" })
  getEvaluationTemplate(@Param("assessmentId") assessmentId: string) {
    return this.evaluationsService.getEvaluationTemplate(+assessmentId);
  }

  @Get("template/:assessmentId/user/:userId")
  @ApiOperation({ summary: "获取用户专用评分模板" })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: UserEvaluationTemplateDto,
  })
  @ApiResponse({ status: 404, description: "考核不存在或用户无权限" })
  getUserEvaluationTemplate(
    @Param("assessmentId") assessmentId: string,
    @Param("userId") userId: string,
    @CurrentUser() currentUser: any
  ) {
    return this.evaluationsService.getUserEvaluationTemplate(
      +assessmentId,
      +userId,
      currentUser.id
    );
  }

  // 新增接口：详细评分
  @Post("detailed-self")
  @ApiOperation({ summary: "提交详细自评" })
  @ApiResponse({ status: 201, description: "提交成功" })
  @ApiResponse({ status: 400, description: "参数错误或业务规则错误" })
  createDetailedSelfEvaluation(
    @Body() createDetailedSelfEvaluationDto: CreateDetailedSelfEvaluationDto,
    @CurrentUser() user: any
  ) {
    return this.evaluationsService.createDetailedSelfEvaluation(
      createDetailedSelfEvaluationDto,
      user.id
    );
  }

  @Post("detailed-leader")
  @ApiOperation({ summary: "提交详细领导评分" })
  @ApiResponse({ status: 201, description: "提交成功" })
  @ApiResponse({ status: 400, description: "参数错误或业务规则错误" })
  createDetailedLeaderEvaluation(
    @Body()
    createDetailedLeaderEvaluationDto: CreateDetailedLeaderEvaluationDto,
    @CurrentUser() user: any
  ) {
    return this.evaluationsService.createDetailedLeaderEvaluation(
      createDetailedLeaderEvaluationDto,
      user.id
    );
  }

  // 新增接口：草稿保存
  @Put("draft/:id")
  @ApiOperation({ summary: "保存评估草稿" })
  @ApiResponse({ status: 200, description: "保存成功" })
  @ApiResponse({ status: 404, description: "评估记录不存在" })
  saveDraft(
    @Param("id") id: string,
    @Body() updateEvaluationDraftDto: UpdateEvaluationDraftDto,
    @CurrentUser() user: any
  ) {
    return this.evaluationsService.saveDraft(
      +id,
      updateEvaluationDraftDto,
      user.id
    );
  }

  @Post("draft")
  @ApiOperation({ summary: "创建评估草稿" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数错误或业务规则错误" })
  createDraft(
    @Body() saveEvaluationDraftDto: SaveEvaluationDraftDto,
    @CurrentUser() user: any
  ) {
    return this.evaluationsService.createDraft(saveEvaluationDraftDto, user.id);
  }

  @Get("progress/:assessmentId")
  @ApiOperation({ summary: "获取考核评分进度" })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: EvaluationProgressDto,
  })
  @ApiResponse({ status: 404, description: "考核不存在" })
  getEvaluationProgress(
    @Param("assessmentId") assessmentId: string,
    @CurrentUser() user: any
  ) {
    return this.evaluationsService.getEvaluationProgress(
      +assessmentId,
      user.id
    );
  }

  @Get("subordinates/:assessmentId")
  @ApiOperation({ summary: "获取下属评分任务" })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: [SubordinateEvaluationTaskDto],
  })
  @ApiResponse({ status: 404, description: "考核不存在" })
  getSubordinatesTasks(
    @Param("assessmentId") assessmentId: string,
    @CurrentUser() user: any
  ) {
    return this.evaluationsService.getSubordinatesTasks(+assessmentId, user.id);
  }

  @Get("detailed/:id")
  @ApiOperation({ summary: "获取详细评分记录" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 404, description: "评估记录不存在" })
  getDetailedEvaluation(@Param("id") id: string, @CurrentUser() user: any) {
    return this.evaluationsService.getDetailedEvaluation(+id, user.id);
  }

  @Get("comparison/:assessmentId/:userId")
  @ApiOperation({ summary: "获取自评与领导评分对比" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 404, description: "评估记录不存在" })
  getEvaluationComparison(
    @Param("assessmentId") assessmentId: string,
    @Param("userId") userId: string,
    @CurrentUser() user: any
  ) {
    return this.evaluationsService.getEvaluationComparison(
      +assessmentId,
      +userId,
      user.id
    );
  }

  @Get("assessment/:assessmentId/user/:userId/complete")
  @ApiOperation({ summary: "获取完整评估详情" })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: CompleteEvaluationResponseDto,
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "评估记录不存在" })
  @Roles("leader", "boss", "admin")
  @UseGuards(RolesGuard)
  getCompleteEvaluation(
    @Param("assessmentId") assessmentId: string,
    @Param("userId") userId: string,
    @Query() query: CompleteEvaluationQueryDto
  ) {
    return this.evaluationsService.getCompleteEvaluation(
      +assessmentId,
      +userId,
      query
    );
  }
}
