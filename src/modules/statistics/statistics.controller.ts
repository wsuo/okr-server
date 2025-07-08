import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('统计分析')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard')
  getDashboard() {
    return this.statisticsService.getDashboard();
  }
}