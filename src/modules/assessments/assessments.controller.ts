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
import { AssessmentsService } from "./assessments.service";
import { ValidationService } from "./services/validation.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CreateAssessmentDto } from "./dto/create-assessment.dto";
import { UpdateAssessmentDto } from "./dto/update-assessment.dto";
import { EditAssessmentDto } from "./dto/edit-assessment.dto";
import { QueryAssessmentsDto } from "./dto/query-assessments.dto";
import {
  EndValidationResponseDto,
  DeleteValidationResponseDto,
  ScorePreviewResponseDto,
} from "./dto/validation-response.dto";

@ApiTags("考核管理")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("assessments")
export class AssessmentsController {
  constructor(
    private readonly assessmentsService: AssessmentsService,
    private readonly validationService: ValidationService
  ) {}

  @Get()
  @ApiOperation({ summary: "获取考核列表" })
  @ApiResponse({ status: 200, description: "获取成功" })
  findAll(@Query() query: QueryAssessmentsDto) {
    return this.assessmentsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取考核详情" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 404, description: "考核不存在" })
  findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.assessmentsService.findOne(+id, user.id);
  }

  @Post()
  @ApiOperation({ summary: "创建考核" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数错误" })
  create(
    @Body() createAssessmentDto: CreateAssessmentDto,
    @CurrentUser() user: any
  ) {
    return this.assessmentsService.create(createAssessmentDto, user.id);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新考核" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 404, description: "考核不存在" })
  update(
    @Param("id") id: string,
    @Body() updateAssessmentDto: UpdateAssessmentDto
  ) {
    return this.assessmentsService.update(+id, updateAssessmentDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除考核" })
  @ApiResponse({ status: 204, description: "删除成功" })
  @ApiResponse({ status: 404, description: "考核不存在" })
  @ApiResponse({ status: 400, description: "无法删除进行中的考核" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string, @CurrentUser() user: any) {
    await this.assessmentsService.remove(+id, user.id);
  }

  @Get(":id/end-validation")
  @ApiOperation({ summary: "考核结束前的校验" })
  @ApiResponse({
    status: 200,
    description: "校验成功",
    type: EndValidationResponseDto,
  })
  @ApiResponse({ status: 404, description: "考核不存在" })
  async validateEndAssessment(
    @Param("id") id: string,
    @CurrentUser() user: any
  ): Promise<EndValidationResponseDto> {
    return this.validationService.validateEndAssessment(+id, user.id);
  }

  @Get(":id/delete-validation")
  @ApiOperation({ summary: "考核删除前的校验" })
  @ApiResponse({
    status: 200,
    description: "校验成功",
    type: DeleteValidationResponseDto,
  })
  @ApiResponse({ status: 404, description: "考核不存在" })
  async validateDeleteAssessment(
    @Param("id") id: string,
    @CurrentUser() user: any
  ): Promise<DeleteValidationResponseDto> {
    return this.validationService.validateDeleteAssessment(+id, user.id);
  }

  @Get(":id/score-preview")
  @ApiOperation({ summary: "获取得分计算预览" })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: ScorePreviewResponseDto,
  })
  @ApiResponse({ status: 404, description: "考核不存在" })
  async getScorePreview(
    @Param("id") id: string
  ): Promise<ScorePreviewResponseDto> {
    return this.validationService.getScorePreview(+id);
  }

  @Put(":id/edit")
  @ApiOperation({ summary: "编辑考核（仅草稿状态）" })
  @ApiResponse({ status: 200, description: "编辑成功" })
  @ApiResponse({ status: 404, description: "考核不存在" })
  @ApiResponse({ status: 400, description: "只能编辑草稿状态的考核" })
  editAssessment(
    @Param("id") id: string,
    @Body() editAssessmentDto: EditAssessmentDto,
    @CurrentUser() user: any
  ) {
    return this.assessmentsService.editAssessment(
      +id,
      editAssessmentDto,
      user.id
    );
  }

  @Get(":id/publish-validation")
  @ApiOperation({ summary: "发布前校验" })
  @ApiResponse({ status: 200, description: "校验成功" })
  @ApiResponse({ status: 404, description: "考核不存在" })
  @ApiResponse({ status: 400, description: "校验失败" })
  async validatePublishAssessment(
    @Param("id") id: string,
    @CurrentUser() user: any
  ) {
    return this.assessmentsService.validatePublishAssessment(+id, user.id);
  }

  @Post(":id/publish")
  @ApiOperation({ summary: "发布考核（草稿→进行中）" })
  @ApiResponse({ status: 200, description: "发布成功" })
  @ApiResponse({ status: 404, description: "考核不存在" })
  @ApiResponse({ status: 400, description: "只能发布草稿状态的考核" })
  publishAssessment(@Param("id") id: string, @CurrentUser() user: any) {
    return this.assessmentsService.publishAssessment(+id, user.id);
  }

  @Post(":id/end")
  @ApiOperation({ summary: "手动结束考核" })
  @ApiResponse({ status: 200, description: "结束成功" })
  @ApiResponse({ status: 404, description: "考核不存在" })
  @ApiResponse({ status: 400, description: "只能结束进行中的考核" })
  @ApiResponse({ status: 403, description: "没有权限结束此考核" })
  endAssessment(@Param("id") id: string, @CurrentUser() user: any) {
    return this.assessmentsService.manualEndAssessment(+id, user.id);
  }
}
