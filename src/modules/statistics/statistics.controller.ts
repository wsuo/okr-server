import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StatisticsQueryDto } from './dto/statistics-query.dto';

@ApiTags('统计分析')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '获取仪表板统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getDashboard() {
    return this.statisticsService.getDashboard();
  }

  @Get('assessments')
  @ApiOperation({ summary: '获取考核统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getAssessmentStatistics(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.getAssessmentStatistics(query);
  }

  @Get('users')
  @ApiOperation({ summary: '获取用户统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getUserStatistics(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.getUserStatistics(query);
  }

  @Get('departments')
  @ApiOperation({ summary: '获取部门统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getDepartmentStatistics() {
    return this.statisticsService.getDepartmentStatistics();
  }

  @Get('okrs')
  @ApiOperation({ summary: '获取OKR统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getOkrStatistics(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.getOkrStatistics(query);
  }

  @Get('evaluations')
  @ApiOperation({ summary: '获取评估统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getEvaluationStatistics(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.getEvaluationStatistics(query);
  }

  @Get('trends')
  @ApiOperation({ summary: '获取绩效趋势数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getPerformanceTrends(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.getPerformanceTrends(query);
  }
}