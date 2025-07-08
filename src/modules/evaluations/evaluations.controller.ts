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
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EvaluationsService } from './evaluations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateSelfEvaluationDto } from './dto/create-self-evaluation.dto';
import { CreateLeaderEvaluationDto } from './dto/create-leader-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { QueryEvaluationsDto } from './dto/query-evaluations.dto';

@ApiTags('评估管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Get()
  @ApiOperation({ summary: '获取评估列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findAll(@Query() query: QueryEvaluationsDto) {
    return this.evaluationsService.findAll(query);
  }

  @Get('my')
  @ApiOperation({ summary: '获取我的评估记录' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getMyEvaluations(
    @CurrentUser() user: any,
    @Query('assessment_id') assessmentId?: number
  ) {
    return this.evaluationsService.getMyEvaluations(user.id, assessmentId);
  }

  @Get('to-give')
  @ApiOperation({ summary: '获取需要我评分的评估' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getEvaluationsToGive(
    @CurrentUser() user: any,
    @Query('assessment_id') assessmentId?: number
  ) {
    return this.evaluationsService.getEvaluationsToGive(user.id, assessmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取评估详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '评估记录不存在' })
  findOne(@Param('id') id: string) {
    return this.evaluationsService.findOne(+id);
  }

  @Post('self')
  @ApiOperation({ summary: '提交自评' })
  @ApiResponse({ status: 201, description: '提交成功' })
  @ApiResponse({ status: 400, description: '参数错误或业务规则错误' })
  createSelfEvaluation(
    @Body() createSelfEvaluationDto: CreateSelfEvaluationDto,
    @CurrentUser() user: any
  ) {
    return this.evaluationsService.createSelfEvaluation(createSelfEvaluationDto, user.id);
  }

  @Post('leader')
  @ApiOperation({ summary: '提交领导评分' })
  @ApiResponse({ status: 201, description: '提交成功' })
  @ApiResponse({ status: 400, description: '参数错误或业务规则错误' })
  createLeaderEvaluation(
    @Body() createLeaderEvaluationDto: CreateLeaderEvaluationDto,
    @CurrentUser() user: any
  ) {
    return this.evaluationsService.createLeaderEvaluation(createLeaderEvaluationDto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新评估' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '评估记录不存在' })
  @ApiResponse({ status: 400, description: '已提交的评估无法修改' })
  update(
    @Param('id') id: string,
    @Body() updateEvaluationDto: UpdateEvaluationDto
  ) {
    return this.evaluationsService.update(+id, updateEvaluationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除评估' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: '评估记录不存在' })
  @ApiResponse({ status: 400, description: '已提交的评估无法删除' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.evaluationsService.remove(+id);
  }
}