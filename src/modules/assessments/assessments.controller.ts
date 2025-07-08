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
import { AssessmentsService } from './assessments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { QueryAssessmentsDto } from './dto/query-assessments.dto';

@ApiTags('考核管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get()
  @ApiOperation({ summary: '获取考核列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findAll(@Query() query: QueryAssessmentsDto) {
    return this.assessmentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取考核详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '考核不存在' })
  findOne(@Param('id') id: string) {
    return this.assessmentsService.findOne(+id);
  }

  @Post()
  @ApiOperation({ summary: '创建考核' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  create(
    @Body() createAssessmentDto: CreateAssessmentDto,
    @CurrentUser() user: any
  ) {
    return this.assessmentsService.create(createAssessmentDto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新考核' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '考核不存在' })
  update(
    @Param('id') id: string,
    @Body() updateAssessmentDto: UpdateAssessmentDto
  ) {
    return this.assessmentsService.update(+id, updateAssessmentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除考核' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: '考核不存在' })
  @ApiResponse({ status: 400, description: '无法删除进行中的考核' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.assessmentsService.remove(+id);
  }

  @Post(':id/end')
  @ApiOperation({ summary: '结束考核' })
  @ApiResponse({ status: 200, description: '结束成功' })
  @ApiResponse({ status: 404, description: '考核不存在' })
  @ApiResponse({ status: 400, description: '只能结束进行中的考核' })
  endAssessment(@Param('id') id: string) {
    return this.assessmentsService.endAssessment(+id);
  }
}